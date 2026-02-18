import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { handlePrismaError } from "../common/helpers/prisma-error.handler";
import { HttpException } from "@nestjs/common";

export interface Insight {
  id: string;
  type: string;
  message: string;
  severity?: "info" | "tip" | "warning";
}

const DAYS_LOOKBACK = 30;
const WEEKEND_HIGHER_RATIO = 1.2;
const CATEGORY_SPIKE_RATIO = 2.0; // e.g. "doubled" when this month >= 2 * last month

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma as any;
  }

  /**
   * Weekend vs weekday: "You spend more on weekends" when daily weekend spending
   * is at least WEEKEND_HIGHER_RATIO times weekday daily over the last DAYS_LOOKBACK days.
   */
  private async weekendInsight(userId: string): Promise<Insight | null> {
    try {
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - DAYS_LOOKBACK);

      const expenses = await this.db.transaction.findMany({
        where: { userId, type: "expense", date: { gte: start, lte: end } },
        select: { amount: true, date: true },
      });

      let weekendTotal = 0,
        weekdayTotal = 0;
      const weekendDays = new Set<string>(),
        weekdayDays = new Set<string>();

      for (const t of expenses as { amount: unknown; date: Date }[]) {
        const d = new Date(t.date);
        const key = d.toISOString().slice(0, 10);
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const amount = Number(t.amount);
        if (isWeekend) {
          weekendTotal += amount;
          weekendDays.add(key);
        } else {
          weekdayTotal += amount;
          weekdayDays.add(key);
        }
      }

      const weekendDaily =
        weekendDays.size > 0 ? weekendTotal / weekendDays.size : 0;
      const weekdayDaily =
        weekdayDays.size > 0 ? weekdayTotal / weekdayDays.size : 0;

      if (
        weekdayDaily > 0 &&
        weekendDaily >= weekdayDaily * WEEKEND_HIGHER_RATIO
      ) {
        return {
          id: "weekend_spend",
          type: "weekend_pattern",
          message:
            "You spend more on weekends. Try setting a small weekend budget to stay on track.",
          severity: "info",
        };
      }
      return null;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "AnalyticsService.weekendInsight");
    }
  }

  /**
   * Category month-over-month: e.g. "Food costs doubled this month" when
   * this month's spend for that category is >= CATEGORY_SPIKE_RATIO * last month.
   */
  private async categorySpikeInsights(userId: string): Promise<Insight[]> {
    try {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthEnd = new Date(thisMonthStart.getTime() - 1);

      const categories = await this.db.category.findMany({
        where: { slug: { not: "income" } },
        select: { id: true, name: true, slug: true },
      });

      const insights: Insight[] = [];

      for (const cat of categories as {
        id: string;
        name: string;
        slug: string;
      }[]) {
        const [thisSum, lastSum] = await Promise.all([
          this.db.transaction.aggregate({
            where: {
              userId,
              type: "expense",
              categoryId: cat.id,
              date: { gte: thisMonthStart, lte: now },
            },
            _sum: { amount: true },
          }),
          this.db.transaction.aggregate({
            where: {
              userId,
              type: "expense",
              categoryId: cat.id,
              date: { gte: lastMonthStart, lte: lastMonthEnd },
            },
            _sum: { amount: true },
          }),
        ]);

        const thisMonth = Number(thisSum._sum?.amount ?? 0);
        const lastMonth = Number(lastSum._sum?.amount ?? 0);

        if (lastMonth > 0 && thisMonth >= lastMonth * CATEGORY_SPIKE_RATIO) {
          insights.push({
            id: `category_spike_${cat.slug}`,
            type: "category_spike",
            message: `${cat.name} costs more than doubled this month compared to last month.`,
            severity: "tip",
          });
        }
      }

      return insights;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(
        error,
        this.logger,
        "AnalyticsService.categorySpikeInsights",
      );
    }
  }

  /**
   * Returns precomputed insights for the authenticated user: weekend pattern,
   * category spikes (e.g. "Food costs doubled this month"), etc.
   */
  async getInsights(userId: string): Promise<Insight[]> {
    try {
      const [weekend, categorySpikes] = await Promise.all([
        this.weekendInsight(userId),
        this.categorySpikeInsights(userId),
      ]);

      const list: Insight[] = [];
      if (weekend) list.push(weekend);
      list.push(...(categorySpikes ?? []));
      return list;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "AnalyticsService.getInsights");
    }
  }
}
