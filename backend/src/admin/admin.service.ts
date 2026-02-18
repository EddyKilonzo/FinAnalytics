import { Injectable, Logger, HttpException } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { handlePrismaError } from "../common/helpers/prisma-error.handler";

/** Query params for admin list endpoints (paginated, optional user filter). */
export interface AdminListQuery {
  page?: number;
  limit?: number;
  userId?: string;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

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
}
