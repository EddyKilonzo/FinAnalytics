import {
  Injectable,
  Logger,
  HttpException,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { MlService } from "../ml/ml.service";
import { handlePrismaError } from "../common/helpers/prisma-error.handler";
import type { CreateTransactionDto } from "./dto/create-transaction.dto";
import type { UpdateTransactionDto } from "./dto/update-transaction.dto";
import type { TransactionQueryDto } from "./dto/transaction-query.dto";
import type { CorrectCategoryDto } from "./dto/correct-category.dto";

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ml: MlService,
  ) {}

  /** Loose cast so we can call Prisma model methods without importing the generated namespace. */
  private get db() {
    return this.prisma as any;
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────

  /**
   * Build the Prisma `where` clause shared by list and count queries.
   * Non-admin users are always scoped to their own userId.
   */
  private buildWhere(
    query: TransactionQueryDto,
    userId: string,
    isAdmin: boolean,
  ) {
    const where: Record<string, any> = {};

    if (!isAdmin) where.userId = userId;
    if (query.type) where.type = query.type;
    if (query.categoryId) where.categoryId = query.categoryId;

    if (query.dateFrom || query.dateTo) {
      where.date = {
        ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
        ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
      };
    }

    return where;
  }

  /**
   * Confirm a category CUID actually exists in the DB.
   * Gives a clear 404 rather than a cryptic foreign-key error.
   * Returns the category record so callers can read its slug without a 2nd query.
   */
  private async validateCategory(categoryId: string): Promise<any> {
    try {
      const cat = await this.db.category.findUnique({
        where: { id: categoryId },
      });
      if (!cat) {
        throw new NotFoundException(
          `Category with id "${categoryId}" was not found`,
        );
      }
      return cat;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(
        error,
        this.logger,
        "TransactionsService.validateCategory",
      );
    }
  }

  /**
   * Resolve a category slug to its database ID.
   * Returns null if the slug doesn't exist so the caller can decide how to handle it.
   */
  private async categoryIdFromSlug(slug: string): Promise<string | null> {
    try {
      const cat = await this.db.category.findUnique({ where: { slug } });
      return cat?.id ?? null;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(
        error,
        this.logger,
        "TransactionsService.categoryIdFromSlug",
      );
    }
  }

  // ─── List ──────────────────────────────────────────────────────────────────

  /**
   * Paginated transaction list with optional filters (type, category, date range).
   * Regular users see only their own transactions; admins see all.
   */
  async findAll(query: TransactionQueryDto, userId: string, userRole: string) {
    try {
      const isAdmin = userRole === "ADMIN";
      const page = query.page ?? 1;
      const limit = query.limit ?? 20;
      const skip = (page - 1) * limit;
      const where = this.buildWhere(query, userId, isAdmin);

      const [transactions, total] = await Promise.all([
        this.db.transaction.findMany({
          where,
          include: { category: true, suggestedCategory: true },
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
      handlePrismaError(error, this.logger, "TransactionsService.findAll");
    }
  }

  // ─── Single ────────────────────────────────────────────────────────────────

  /**
   * Fetch one transaction by ID.
   * Regular users cannot view transactions that belong to another user.
   */
  async findById(id: string, userId: string, userRole: string): Promise<any> {
    try {
      const transaction = await this.db.transaction.findUnique({
        where: { id },
        include: { category: true, suggestedCategory: true },
      });

      if (!transaction) {
        throw new NotFoundException(
          `Transaction with id "${id}" was not found`,
        );
      }

      if (userRole !== "ADMIN" && transaction.userId !== userId) {
        throw new ForbiddenException(
          "You do not have permission to view this transaction",
        );
      }

      return transaction;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "TransactionsService.findById");
    }
  }

  // ─── Create ────────────────────────────────────────────────────────────────

  /**
   * Record a new transaction for the authenticated user.
   *
   * Flow:
   *  1. Validate the user-supplied categoryId (if any).
   *  2. Create the transaction row.
   *  3. Call the ML service to get a category suggestion (2–3 second timeout).
   *     • If ML responds in time → update the row with suggestedCategoryId +
   *       categoryConfidence and return the enriched record.
   *     • If ML is unavailable → return the transaction without ML fields
   *       (graceful degradation; does not fail the request).
   */
  async create(dto: CreateTransactionDto, userId: string): Promise<any> {
    try {
      if (dto.categoryId) {
        await this.validateCategory(dto.categoryId);
      }

      // Step 1 — persist the transaction
      const transaction = await this.db.transaction.create({
        data: {
          amount: dto.amount,
          type: dto.type,
          description: dto.description ?? null,
          date: dto.date ? new Date(dto.date) : new Date(),
          categoryId: dto.categoryId ?? null,
          incomeSource:
            dto.type === "income" && dto.incomeSource
              ? dto.incomeSource.trim()
              : null,
          userId,
        },
        include: { category: true, suggestedCategory: true },
      });

      this.logger.log(
        `Transaction created: ${transaction.id} (${dto.type} KES ${dto.amount}) — user ${userId}`,
      );

      // Step 2 — request ML categorisation (non-blocking on failure)
      if (dto.description?.trim()) {
        const prediction = await this.ml.categorise(dto.description, dto.type);

        if (prediction) {
          const suggestedCategoryId = await this.categoryIdFromSlug(
            prediction.suggestedCategorySlug,
          );

          if (suggestedCategoryId) {
            const enriched = await this.db.transaction.update({
              where: { id: transaction.id },
              data: {
                suggestedCategoryId,
                categoryConfidence: prediction.confidence,
              },
              include: { category: true, suggestedCategory: true },
            });

            this.logger.log(
              `ML suggestion: "${prediction.suggestedCategorySlug}" ` +
                `(${(prediction.confidence * 100).toFixed(1)}%) for tx ${transaction.id}`,
            );
            return enriched;
          }
        }
      }

      return transaction;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "TransactionsService.create");
    }
  }

  // ─── Update ────────────────────────────────────────────────────────────────

  /**
   * Update a transaction.
   * Ownership is enforced: regular users may only edit their own transactions.
   */
  async update(
    id: string,
    dto: UpdateTransactionDto,
    userId: string,
    userRole: string,
  ): Promise<any> {
    try {
      const existing = await this.findById(id, userId, userRole);

      if (dto.categoryId !== undefined && dto.categoryId !== null) {
        await this.validateCategory(dto.categoryId);
      }

      const data: Record<string, any> = {};
      if (dto.amount !== undefined) data.amount = dto.amount;
      if (dto.type !== undefined) data.type = dto.type;
      if (dto.description !== undefined) data.description = dto.description;
      if (dto.date !== undefined) data.date = new Date(dto.date);
      if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;

      const effectiveType = dto.type ?? (existing as any).type;
      if (effectiveType === "expense") {
        data.incomeSource = null;
      } else if (dto.incomeSource !== undefined) {
        data.incomeSource = dto.incomeSource
          ? String(dto.incomeSource).trim()
          : null;
      }

      const updated = await this.db.transaction.update({
        where: { id },
        data,
        include: { category: true, suggestedCategory: true },
      });

      this.logger.log(`Transaction updated: ${id} by user ${userId}`);
      return updated;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "TransactionsService.update");
    }
  }

  // ─── Correct category ──────────────────────────────────────────────────────

  /**
   * Allow the user to correct the category on a transaction (e.g. overriding the
   * ML suggestion).
   *
   * This:
   *  1. Validates ownership and the new categoryId.
   *  2. Updates categoryId on the transaction.
   *  3. Fire-and-forgets a correction to the ML service so future predictions
   *     for similar descriptions improve.
   *
   * The suggestedCategoryId/categoryConfidence fields are preserved so we can
   * later query "corrections" (transactions where categoryId ≠ suggestedCategoryId)
   * for model evaluation.
   */
  async correctCategory(
    id: string,
    dto: CorrectCategoryDto,
    userId: string,
    userRole: string,
  ): Promise<any> {
    try {
      const existing = await this.findById(id, userId, userRole);
      const newCategory = await this.validateCategory(dto.categoryId);

      const updated = await this.db.transaction.update({
        where: { id },
        data: { categoryId: dto.categoryId },
        include: { category: true, suggestedCategory: true },
      });

      this.logger.log(
        `Category corrected on tx ${id}: "${newCategory.slug}" — user ${userId}`,
      );

      // Push feedback to ML service (non-blocking — don't await)
      if (existing.description?.trim()) {
        this.ml
          .sendFeedback(existing.description, newCategory.slug)
          .catch((err: unknown) => {
            this.logger.warn(
              `ML feedback send failed for tx ${id}: ${err instanceof Error ? err.message : String(err)}`,
            );
          });
      }

      return updated;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(
        error,
        this.logger,
        "TransactionsService.correctCategory",
      );
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async delete(id: string, userId: string, userRole: string): Promise<void> {
    try {
      await this.findById(id, userId, userRole);
      await this.db.transaction.delete({ where: { id } });
      this.logger.log(`Transaction deleted: ${id} by user ${userId}`);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "TransactionsService.delete");
    }
  }

  // ─── Summary / Dashboard ──────────────────────────────────────────────────

  /**
   * Compute total income, total expenses, and net balance for a user.
   * Supports an optional date range so the dashboard can show monthly figures.
   */
  async getSummary(userId: string, dateFrom?: string, dateTo?: string) {
    try {
      const dateFilter =
        dateFrom || dateTo
          ? {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            }
          : undefined;

      const baseWhere = { userId, ...(dateFilter ? { date: dateFilter } : {}) };

      const [incomeResult, expenseResult] = await Promise.all([
        this.db.transaction.aggregate({
          where: { ...baseWhere, type: "income" },
          _sum: { amount: true },
        }),
        this.db.transaction.aggregate({
          where: { ...baseWhere, type: "expense" },
          _sum: { amount: true },
        }),
      ]);

      const totalIncome = +Number(incomeResult._sum.amount ?? 0).toFixed(2);
      const totalExpenses = +Number(expenseResult._sum.amount ?? 0).toFixed(2);
      const balance = +(totalIncome - totalExpenses).toFixed(2);

      // Income by source (Phase 9)
      const incomeBySource = await this.getIncomeBySource(
        userId,
        dateFrom,
        dateTo,
      );

      return { totalIncome, totalExpenses, balance, incomeBySource };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "TransactionsService.getSummary");
    }
  }

  /**
   * Return income totals broken down by source (HELB, parents, part_time_job, etc.).
   * Used for analytics and dashboard when user has multiple income sources.
   */
  async getIncomeBySource(
    userId: string,
    dateFrom?: string,
    dateTo?: string,
  ): Promise<{ source: string; total: number }[]> {
    try {
      const dateFilter =
        dateFrom || dateTo
          ? {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            }
          : undefined;

      const transactions = await this.db.transaction.findMany({
        where: {
          userId,
          type: "income",
          ...(dateFilter ? { date: dateFilter } : {}),
        },
        select: { amount: true, incomeSource: true },
      });

      const grouped: Record<string, number> = {};
      for (const t of transactions as {
        amount: unknown;
        incomeSource: string | null;
      }[]) {
        const source = t.incomeSource?.trim() || "other";
        grouped[source] = +(
          Number(grouped[source] ?? 0) + Number(t.amount)
        ).toFixed(2);
      }
      return Object.entries(grouped)
        .map(([source, total]) => ({ source, total }))
        .sort((a, b) => b.total - a.total);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(
        error,
        this.logger,
        "TransactionsService.getIncomeBySource",
      );
    }
  }

  /**
   * Return spending totals broken down by category for a user.
   * Drives the pie/bar charts on the dashboard.
   */
  async getSpendingByCategory(
    userId: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    try {
      const dateFilter =
        dateFrom || dateTo
          ? {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            }
          : undefined;

      const transactions = await this.db.transaction.findMany({
        where: {
          userId,
          type: "expense",
          ...(dateFilter ? { date: dateFilter } : {}),
        },
        include: { category: true },
      });

      const grouped: Record<
        string,
        {
          categoryId: string | null;
          name: string;
          color: string | null;
          slug: string | null;
          total: number;
        }
      > = {};

      for (const t of transactions as any[]) {
        const key = t.categoryId ?? "uncategorised";
        const name = t.category?.name ?? "Uncategorised";
        if (!grouped[key]) {
          grouped[key] = {
            categoryId: t.categoryId,
            name,
            color: t.category?.color ?? null,
            slug: t.category?.slug ?? null,
            total: 0,
          };
        }
        grouped[key].total = +(grouped[key].total + Number(t.amount)).toFixed(
          2,
        );
      }

      return Object.values(grouped).sort((a, b) => b.total - a.total);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(
        error,
        this.logger,
        "TransactionsService.getSpendingByCategory",
      );
    }
  }
}
