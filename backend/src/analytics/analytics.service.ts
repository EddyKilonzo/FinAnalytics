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
   * Insight that always appears when the user has any expenses this month:
   * e.g. "You've spent KSh 5,200 across 8 transactions this month."
   */
  private async thisMonthSummaryInsight(userId: string): Promise<Insight | null> {
    try {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [sumResult, countResult] = await Promise.all([
        this.db.transaction.aggregate({
          where: {
            userId,
            type: "expense",
            date: { gte: thisMonthStart, lte: now },
          },
          _sum: { amount: true },
        }),
        this.db.transaction.count({
          where: {
            userId,
            type: "expense",
            date: { gte: thisMonthStart, lte: now },
          },
        }),
      ]);

      const total = Number(sumResult._sum?.amount ?? 0);
      const count = countResult ?? 0;
      if (count === 0 && total <= 0) return null;

      const formatted = new Intl.NumberFormat("en-KE", {
        style: "currency",
        currency: "KES",
        maximumFractionDigits: 0,
      }).format(total);
      const message =
        count === 1
          ? `You've logged 1 expense this month (${formatted}). Keep logging to see more insights.`
          : `You've spent ${formatted} across ${count} transactions this month.`;

      return {
        id: "this_month_summary",
        type: "monthly_summary",
        message,
        severity: "info",
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(
        error,
        this.logger,
        "AnalyticsService.thisMonthSummaryInsight",
      );
    }
  }

  /**
   * Top spending category this month — shows whenever there is at least one
   * category with spending.
   */
  private async topCategoryInsight(userId: string): Promise<Insight | null> {
    try {
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const expenses = await this.db.transaction.findMany({
        where: {
          userId,
          type: "expense",
          date: { gte: thisMonthStart, lte: now },
          categoryId: { not: null },
        },
        select: { amount: true, categoryId: true },
      });

      const byCategory: Record<string, { total: number; name?: string }> = {};
      for (const t of expenses as { amount: unknown; categoryId: string | null }[]) {
        const cid = t.categoryId ?? "uncategorized";
        if (!byCategory[cid]) byCategory[cid] = { total: 0 };
        byCategory[cid].total += Number(t.amount);
      }

      const categoryIds = Object.keys(byCategory).filter((k) => k !== "uncategorized");
      if (categoryIds.length === 0) return null;

      const categories = await this.db.category.findMany({
        where: { id: { in: categoryIds } },
        select: { id: true, name: true },
      });
      const nameById = new Map(categories.map((c: { id: string; name: string }) => [c.id, c.name]));
      for (const id of categoryIds) {
        byCategory[id].name = nameById.get(id) ?? "Other";
      }

      const top = Object.entries(byCategory)
        .filter(([, v]) => v.total > 0)
        .sort((a, b) => b[1].total - a[1].total)[0];
      if (!top) return null;

      const [_, { total, name }] = top;
      const formatted = new Intl.NumberFormat("en-KE", {
        style: "currency",
        currency: "KES",
        maximumFractionDigits: 0,
      }).format(total);

      return {
        id: "top_category",
        type: "top_category",
        message: `Your top spending category this month is ${name ?? "Other"} (${formatted}).`,
        severity: "tip",
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(
        error,
        this.logger,
        "AnalyticsService.topCategoryInsight",
      );
    }
  }

  /**
   * Returns precomputed insights for the authenticated user: this month summary,
   * top category, weekend pattern, category spikes, etc. Always includes at least
   * one insight when the user has any expense data this month.
   */
  async getInsights(userId: string): Promise<Insight[]> {
    try {
      const [summary, topCat, weekend, categorySpikes] = await Promise.all([
        this.thisMonthSummaryInsight(userId),
        this.topCategoryInsight(userId),
        this.weekendInsight(userId),
        this.categorySpikeInsights(userId),
      ]);

      const list: Insight[] = [];
      if (summary) list.push(summary);
      if (topCat) list.push(topCat);
      if (weekend) list.push(weekend);
      list.push(...(categorySpikes ?? []));
      return list;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "AnalyticsService.getInsights");
    }
  }
}
