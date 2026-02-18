import {
  Injectable,
  Logger,
  HttpException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { handlePrismaError } from '../common/helpers/prisma-error.handler';
import type { CreateBudgetDto } from './dto/create-budget.dto';
import type { UpdateBudgetDto } from './dto/update-budget.dto';

/** Threshold at which we flag a budget as "near the limit" (80 %). */
const NEAR_LIMIT_THRESHOLD = 80;

/** Below this percentage used we consider the user "under budget" and may show a positive nudge. */
const UNDER_BUDGET_THRESHOLD = 85;

/** Only show under-budget nudge once at least this fraction of the budget period has elapsed (e.g. 25%). */
const UNDER_BUDGET_MIN_PERIOD_ELAPSED = 0.25;

/** Category slug used for social spending (highlighted in purple per product spec). */
const SOCIAL_SLUG = 'social';

/** Shape of a single nudge returned in the alerts/nudges array. */
export interface NudgeItem {
  id: string;
  type: string;
  message: string;
  severity: string;
}

@Injectable()
export class BudgetsService {
  private readonly logger = new Logger(BudgetsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma as any;
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────

  /**
   * Fetch a budget and verify ownership.
   * Throws 404 if missing, 403 if the requester doesn't own it
   * (admins bypass the ownership check).
   */
  private async findAndAuthorise(
    id: string,
    userId: string,
    userRole: string,
  ): Promise<any> {
    try {
      const budget = await this.db.budget.findUnique({
        where: { id },
        include: { category: true },
      });

      if (!budget) {
        throw new NotFoundException(`Budget with id "${id}" was not found`);
      }

      if (userRole !== 'ADMIN' && budget.userId !== userId) {
        throw new ForbiddenException('You do not have permission to access this budget');
      }

      return budget;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'BudgetsService.findAndAuthorise');
    }
  }

  /**
   * Guard against creating a budget that overlaps an existing one for the same
   * category (or overall) for the same user.
   *
   * Two date windows [a.startAt, a.endAt] and [b.startAt, b.endAt] overlap when:
   *   a.startAt < b.endAt  AND  a.endAt > b.startAt
   *
   * @param excludeId – skip this budget ID when checking (used during update)
   */
  private async checkOverlap(
    userId: string,
    categoryId: string | null | undefined,
    startAt: Date,
    endAt: Date,
    excludeId?: string,
  ): Promise<void> {
    try {
      const where: Record<string, any> = {
        userId,
        categoryId: categoryId ?? null,
        startAt: { lt: endAt },
        endAt:   { gt: startAt },
      };

      if (excludeId) {
        where.id = { not: excludeId };
      }

      const existing = await this.db.budget.findFirst({ where });

      if (existing) {
        const scope = categoryId ? 'this category' : 'overall spending';
        throw new ConflictException(
          `You already have a budget for ${scope} that overlaps the requested date window ` +
          `(existing budget id: "${existing.id}"). Update or delete it first.`,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'BudgetsService.checkOverlap');
    }
  }

  /**
   * Query the DB for total expense spending within a budget's date window,
   * optionally scoped to its category.
   */
  private async calcSpending(budget: any): Promise<number> {
    try {
      const result = await this.db.transaction.aggregate({
        where: {
          userId:     budget.userId,
          type:       'expense',
          date:       { gte: budget.startAt, lte: budget.endAt },
          ...(budget.categoryId ? { categoryId: budget.categoryId } : {}),
        },
        _sum: { amount: true },
      });

      return +(Number(result._sum.amount ?? 0).toFixed(2));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'BudgetsService.calcSpending');
    }
  }

  /**
   * Attach real-time spending, percentage-used, alert status, and social flag to
   * a budget object. This is what we return to the client so they can render
   * progress bars and apply purple highlighting for the "Social" category.
   */
  private async enrichWithSummary(budget: any) {
    try {
      const totalSpent     = await this.calcSpending(budget);
      const limitAmount    = +Number(budget.limitAmount).toFixed(2);
      const percentageUsed =
        limitAmount > 0 ? +((totalSpent / limitAmount) * 100).toFixed(1) : 0;

      const alertStatus: 'over' | 'near' | 'ok' =
        percentageUsed >= 100 ? 'over' :
        percentageUsed >= NEAR_LIMIT_THRESHOLD ? 'near' : 'ok';

      // Social spending is highlighted in purple per product spec
      const isSocial = budget.category?.slug === SOCIAL_SLUG;

      return {
        ...budget,
        limitAmount,
        totalSpent,
        remaining:     +(limitAmount - totalSpent).toFixed(2),
        percentageUsed,
        alertStatus,
        isSocial,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'BudgetsService.enrichWithSummary');
    }
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  /**
   * Create a new budget for the authenticated user.
   *
   * Validates:
   *  • categoryId (if provided) exists.
   *  • endAt is strictly after startAt.
   *  • No existing budget for the same category overlaps this date window (409).
   */
  async create(dto: CreateBudgetDto, userId: string): Promise<any> {
    try {
      if (new Date(dto.endAt) <= new Date(dto.startAt)) {
        throw new BadRequestException('endAt must be after startAt');
      }

      if (dto.categoryId) {
        const cat = await this.db.category.findUnique({ where: { id: dto.categoryId } });
        if (!cat) {
          throw new NotFoundException(`Category with id "${dto.categoryId}" was not found`);
        }
      }

      await this.checkOverlap(
        userId,
        dto.categoryId,
        new Date(dto.startAt),
        new Date(dto.endAt),
      );

      const budget = await this.db.budget.create({
        data: {
          userId,
          categoryId:  dto.categoryId ?? null,
          limitAmount: dto.limitAmount,
          period:      dto.period,
          startAt:     new Date(dto.startAt),
          endAt:       new Date(dto.endAt),
        },
        include: { category: true },
      });

      this.logger.log(
        `Budget created: ${budget.id} (${dto.period} limit KES ${dto.limitAmount}) — user ${userId}`,
      );
      return this.enrichWithSummary(budget);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'BudgetsService.create');
    }
  }

  /**
   * Return all budgets for the authenticated user, each enriched with current
   * spending and alert status.
   */
  async findAll(userId: string, userRole: string): Promise<any[]> {
    try {
      const where = userRole === 'ADMIN' ? {} : { userId };

      const budgets = await this.db.budget.findMany({
        where,
        include: { category: true },
        orderBy: { startAt: 'desc' },
      });

      return Promise.all(budgets.map((b: any) => this.enrichWithSummary(b)));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'BudgetsService.findAll');
    }
  }

  /**
   * Fetch a single budget with its live spending summary.
   */
  async findById(id: string, userId: string, userRole: string): Promise<any> {
    try {
      const budget = await this.findAndAuthorise(id, userId, userRole);
      return this.enrichWithSummary(budget);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'BudgetsService.findById');
    }
  }

  /**
   * Update a budget's fields. Confirms ownership before writing.
   * Re-runs overlap detection if the date window changes.
   */
  async update(
    id: string,
    dto: UpdateBudgetDto,
    userId: string,
    userRole: string,
  ): Promise<any> {
    try {
      const existing = await this.findAndAuthorise(id, userId, userRole);

      const newStart = dto.startAt ? new Date(dto.startAt) : existing.startAt;
      const newEnd   = dto.endAt   ? new Date(dto.endAt)   : existing.endAt;
      if (newEnd <= newStart) {
        throw new BadRequestException('endAt must be after startAt');
      }

      const newCategoryId = dto.categoryId !== undefined ? dto.categoryId : existing.categoryId;

      if (dto.categoryId) {
        const cat = await this.db.category.findUnique({ where: { id: dto.categoryId } });
        if (!cat) {
          throw new NotFoundException(`Category with id "${dto.categoryId}" was not found`);
        }
      }

      // Only check overlap if the window or category changed
      const windowChanged =
        dto.startAt !== undefined || dto.endAt !== undefined || dto.categoryId !== undefined;

      if (windowChanged) {
        await this.checkOverlap(userId, newCategoryId, newStart, newEnd, id);
      }

      const data: Record<string, any> = {};
      if (dto.categoryId  !== undefined) data.categoryId  = dto.categoryId;
      if (dto.limitAmount !== undefined) data.limitAmount = dto.limitAmount;
      if (dto.period      !== undefined) data.period      = dto.period;
      if (dto.startAt     !== undefined) data.startAt     = new Date(dto.startAt);
      if (dto.endAt       !== undefined) data.endAt       = new Date(dto.endAt);

      const updated = await this.db.budget.update({
        where: { id },
        data,
        include: { category: true },
      });

      this.logger.log(`Budget updated: ${id} by user ${userId}`);
      return this.enrichWithSummary(updated);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'BudgetsService.update');
    }
  }

  /**
   * Delete a budget. Confirms ownership before removing.
   */
  async delete(id: string, userId: string, userRole: string): Promise<void> {
    try {
      await this.findAndAuthorise(id, userId, userRole);
      await this.db.budget.delete({ where: { id } });
      this.logger.log(`Budget deleted: ${id} by user ${userId}`);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'BudgetsService.delete');
    }
  }

  // ─── Alerts ────────────────────────────────────────────────────────────────

  /**
   * Return only the budgets that are "near" (≥ 80 %) or "over" (≥ 100 %) limit.
   * Social budgets are always included when they hit the near/over threshold.
   * Sorted by severity: over-limit first, then near-limit, then by percentageUsed descending.
   */
  async getBudgetAlerts(userId: string, userRole: string): Promise<any[]> {
    try {
      const all = await this.findAll(userId, userRole);

      return (all as any[])
        .filter((b) => b.alertStatus !== 'ok')
        .sort((a, b) => {
          if (a.alertStatus === 'over' && b.alertStatus !== 'over') return -1;
          if (b.alertStatus === 'over' && a.alertStatus !== 'over') return  1;
          return b.percentageUsed - a.percentageUsed;
        });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'BudgetsService.getBudgetAlerts');
    }
  }

  /**
   * Nudge: weekend overspend pattern.
   * Compare average daily expense on weekends (Sat/Sun) vs weekdays over the last 30 days.
   * If weekend daily average is at least WEEKEND_OVESPEND_RATIO (e.g. 1.2) times weekday average,
   * return a nudge so the app can show "You tend to spend more on weekends."
   */
  private async getWeekendOverspendNudge(userId: string): Promise<{ id: string; type: string; message: string; severity: string } | null> {
    const DAYS_LOOKBACK = 30;
    const WEEKEND_OVESPEND_RATIO = 1.2; // 20% higher weekend spending triggers nudge

    try {
      const end = new Date();
      const start = new Date(end);
      start.setDate(start.getDate() - DAYS_LOOKBACK);

      const expenses = await this.db.transaction.findMany({
        where: {
          userId,
          type: 'expense',
          date: { gte: start, lte: end },
        },
        select: { amount: true, date: true },
      });

      let weekendTotal = 0;
      let weekdayTotal = 0;
      let weekendDays = 0;
      let weekdayDays = 0;
      const seenWeekend = new Set<string>();
      const seenWeekday = new Set<string>();

      for (const t of expenses as { amount: unknown; date: Date }[]) {
        const d = new Date(t.date);
        const key = d.toISOString().slice(0, 10);
        const day = d.getDay(); // 0 = Sun, 6 = Sat
        const isWeekend = day === 0 || day === 6;
        const amount = Number(t.amount);

        if (isWeekend) {
          weekendTotal += amount;
          if (!seenWeekend.has(key)) {
            seenWeekend.add(key);
            weekendDays++;
          }
        } else {
          weekdayTotal += amount;
          if (!seenWeekday.has(key)) {
            seenWeekday.add(key);
            weekdayDays++;
          }
        }
      }

      const weekendDaily = weekendDays > 0 ? weekendTotal / weekendDays : 0;
      const weekdayDaily = weekdayDays > 0 ? weekdayTotal / weekdayDays : 0;

      if (weekdayDaily > 0 && weekendDaily >= weekdayDaily * WEEKEND_OVESPEND_RATIO) {
        return {
          id: 'weekend_overspend',
          type: 'weekend_overspend_pattern',
          message: 'You tend to spend more on weekends. Consider setting a small weekend budget to stay on track.',
          severity: 'info',
        };
      }
      return null;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'BudgetsService.getWeekendOverspendNudge');
    }
  }

  /**
   * Positive nudge: "Great job! You're under budget this period."
   * Only returned when the user has at least one *active* budget (endAt in the future) that is
   * both below UNDER_BUDGET_THRESHOLD (e.g. 85% used) and past a minimum share of the period
   * (so the win is meaningful, not just "day one").
   */
  private async getUnderBudgetNudge(userId: string): Promise<NudgeItem | null> {
    try {
      const now = new Date();
      const where = { userId, endAt: { gte: now } };
      const budgets = await this.db.budget.findMany({
        where,
        include: { category: true },
      });

      if (budgets.length === 0) return null;

      const enriched = await Promise.all(
        (budgets as any[]).map((b: any) => this.enrichWithSummary(b)),
      );

      const msPerDay = 1000 * 60 * 60 * 24;
      const underBudgets = enriched.filter((b: any) => {
        if (b.alertStatus !== 'ok' || b.percentageUsed >= UNDER_BUDGET_THRESHOLD) return false;
        const start = new Date(b.startAt).getTime();
        const end = new Date(b.endAt).getTime();
        const elapsed = (now.getTime() - start) / msPerDay;
        const totalDays = (end - start) / msPerDay;
        const fractionElapsed = totalDays > 0 ? elapsed / totalDays : 0;
        return fractionElapsed >= UNDER_BUDGET_MIN_PERIOD_ELAPSED;
      });

      if (underBudgets.length === 0) return null;

      const label = underBudgets[0].category?.name ?? 'overall spending';
      const pctUnder = +(100 - underBudgets[0].percentageUsed).toFixed(0);
      const message =
        underBudgets.length === 1
          ? `Great job! You're ${pctUnder}% under budget on ${label} this period.`
          : `Great job! You're under budget on ${underBudgets.length} categories this period.`;

      return {
        id: 'under_budget',
        type: 'under_budget',
        message,
        severity: 'info',
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'BudgetsService.getUnderBudgetNudge');
    }
  }

  /**
   * Get all alerts: budget alerts (near/over limit) plus pattern-based nudges
   * (weekend overspend, under budget) and goal-based nudges (save X more per week).
   * Goal nudges are fetched via GoalsService when available.
   * Response shape: { budgetAlerts, nudges } so the app can show both.
   */
  async getAlerts(
    userId: string,
    userRole: string,
    goalNudges: NudgeItem[] = [],
  ): Promise<{ budgetAlerts: any[]; nudges: any[] }> {
    try {
      const [budgetAlerts, weekendNudge, underBudgetNudge] = await Promise.all([
        this.getBudgetAlerts(userId, userRole),
        this.getWeekendOverspendNudge(userId),
        this.getUnderBudgetNudge(userId),
      ]);

      const nudges: NudgeItem[] = [];
      if (weekendNudge) nudges.push(weekendNudge);
      if (underBudgetNudge) nudges.push(underBudgetNudge);
      nudges.push(...goalNudges);

      return { budgetAlerts, nudges };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'BudgetsService.getAlerts');
    }
  }
}
