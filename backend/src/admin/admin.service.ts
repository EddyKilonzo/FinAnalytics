import { Injectable, Logger, HttpException } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { handlePrismaError } from "../common/helpers/prisma-error.handler";
import { MlService } from "../ml/ml.service";

/** Query params for admin list endpoints (paginated, optional user filter). */
export interface AdminListQuery {
  page?: number;
  limit?: number;
  userId?: string;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ml: MlService,
  ) {}

  private get db() {
    return this.prisma as any;
  }

  /**
   * Dashboard stats for admin: counts of users, transactions, budgets, goals.
   * Optionally include recent signups (last 7 days).
   */
  async getDashboard(): Promise<{
    totalUsers: number;
    totalTransactions: number;
    totalBudgets: number;
    totalGoals: number;
    recentSignups: number;
  }> {
    try {
      const [
        totalUsers,
        totalTransactions,
        totalBudgets,
        totalGoals,
        recentSignups,
      ] = await Promise.all([
        this.db.user.count(),
        this.db.transaction.count(),
        this.db.budget.count(),
        this.db.goal.count(),
        this.db.user.count({
          where: {
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

      return {
        totalUsers,
        totalTransactions,
        totalBudgets,
        totalGoals,
        recentSignups,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "AdminService.getDashboard");
    }
  }

  /**
   * Monthly stats for the last N months: transaction counts and new user signups.
   * Used by the admin dashboard chart.
   */
  async getMonthlyStats(months = 6): Promise<{ label: string; transactions: number; users: number }[]> {
    try {
      const now = new Date();
      const results: { label: string; transactions: number; users: number }[] = [];

      for (let i = months - 1; i >= 0; i--) {
        const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59, 999);

        const [transactions, users] = await Promise.all([
          this.db.transaction.count({ where: { createdAt: { gte: start, lte: end } } }),
          this.db.user.count({ where: { createdAt: { gte: start, lte: end } } }),
        ]);

        results.push({
          label: start.toLocaleDateString("en-KE", { month: "short", year: "2-digit" }),
          transactions,
          users,
        });
      }

      return results;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "AdminService.getMonthlyStats");
    }
  }

  /**
   * List all transactions (optionally filtered by userId). Paginated.
   */
  async getAllTransactions(query: AdminListQuery): Promise<{
    transactions: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const page = Math.max(1, query.page ?? 1);
      const limit = Math.min(100, Math.max(1, query.limit ?? 20));
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = {};
      if (query.userId) where.userId = query.userId;

      const [transactions, total] = await Promise.all([
        this.db.transaction.findMany({
          where,
          include: {
            category: true,
            user: { select: { id: true, email: true, name: true } },
          },
          orderBy: { date: "desc" },
          skip,
          take: limit,
        }),
        this.db.transaction.count({ where }),
      ]);

      return {
        transactions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "AdminService.getAllTransactions");
    }
  }

  /**
   * List all budgets (optionally filtered by userId). Paginated.
   */
  async getAllBudgets(query: AdminListQuery): Promise<{
    budgets: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const page = Math.max(1, query.page ?? 1);
      const limit = Math.min(100, Math.max(1, query.limit ?? 20));
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = {};
      if (query.userId) where.userId = query.userId;

      const [budgets, total] = await Promise.all([
        this.db.budget.findMany({
          where,
          include: {
            category: true,
            user: { select: { id: true, email: true, name: true } },
          },
          orderBy: { startAt: "desc" },
          skip,
          take: limit,
        }),
        this.db.budget.count({ where }),
      ]);

      return {
        budgets,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "AdminService.getAllBudgets");
    }
  }

  /**
   * List all goals (optionally filtered by userId). Paginated.
   */
  async getAllGoals(query: AdminListQuery): Promise<{
    goals: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const page = Math.max(1, query.page ?? 1);
      const limit = Math.min(100, Math.max(1, query.limit ?? 20));
      const skip = (page - 1) * limit;

      const where: Record<string, unknown> = {};
      if (query.userId) where.userId = query.userId;

      const [goals, total] = await Promise.all([
        this.db.goal.findMany({
          where,
          include: { user: { select: { id: true, email: true, name: true } } },
          orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
          skip,
          take: limit,
        }),
        this.db.goal.count({ where }),
      ]);

      return {
        goals,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "AdminService.getAllGoals");
    }
  }

  /**
   * Push every stored `MlFeedback` row to the Python ML service so it can be
   * merged on the next /retrain. Use when the ML container lost feedback.jsonl
   * or after fixing slug validation for new categories.
   */
  async pushMlFeedbackToMl(): Promise<{
    total: number;
    acknowledged: number;
    failed: number;
  }> {
    try {
      const rows = await this.db.mlFeedback.findMany({
        orderBy: { createdAt: "asc" },
        select: { description: true, correctedSlug: true },
      });

      let acknowledged = 0;
      let failed = 0;

      for (const row of rows) {
        const desc = row.description?.trim();
        const slug = row.correctedSlug?.trim();
        if (!desc || !slug) {
          failed++;
          continue;
        }
        const ok = await this.ml.sendFeedback(desc, slug);
        if (ok) {
          acknowledged++;
        } else {
          failed++;
        }
      }

      this.logger.log(
        `ML feedback sync: ${acknowledged}/${rows.length} acknowledged, ${failed} failed`,
      );

      return { total: rows.length, acknowledged, failed };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "AdminService.pushMlFeedbackToMl");
    }
  }
}
