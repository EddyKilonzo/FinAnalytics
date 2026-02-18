import {
  Injectable,
  Logger,
  HttpException,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { handlePrismaError } from "../common/helpers/prisma-error.handler";
import type { CreateGoalDto } from "./dto/create-goal.dto";
import type { UpdateGoalDto } from "./dto/update-goal.dto";
import type { AllocateGoalDto } from "./dto/allocate-goal.dto";
import type { WithdrawGoalDto } from "./dto/withdraw-goal.dto";

@Injectable()
export class GoalsService {
  private readonly logger = new Logger(GoalsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma as any;
  }

  // ─── Internal helpers ──────────────────────────────────────────────────────

  /**
   * Fetch a goal and enforce ownership.
   * Throws 404 if the goal doesn't exist, 403 if the requester doesn't own it
   * (admins bypass ownership checks).
   */
  private async findAndAuthorise(
    id: string,
    userId: string,
    userRole: string,
  ): Promise<any> {
    try {
      const goal = await this.db.goal.findUnique({ where: { id } });

      if (!goal) {
        throw new NotFoundException(`Goal with id "${id}" was not found`);
      }

      if (userRole !== "ADMIN" && goal.userId !== userId) {
        throw new ForbiddenException(
          "You do not have permission to access this goal",
        );
      }

      return goal;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "GoalsService.findAndAuthorise");
    }
  }

  /**
   * Compute progress fields so the frontend can render progress bars and
   * "on track" indicators without any extra logic.
   *
   * On-track calculation
   * ─────────────────────
   * We compare the user's *current savings rate* against the *required rate* to
   * reach the target by the deadline.
   *
   * Required daily rate = (target - current) / daysRemaining
   * Actual daily rate   = current / daysSinceCreation
   *
   * If actualRate ≥ requiredRate the goal is on_track; otherwise at_risk.
   * This is more accurate than the simple "< 30 days + < 80%" heuristic.
   *
   * Fields added:
   *  - percentage:        0-100 (capped at 100 for display)
   *  - status:             completed | on_track | at_risk | overdue | in_progress
   *  - daysRemaining:      calendar days to deadline (null if no deadline)
   *  - dailyRateNeeded:    KES/day required to hit target by deadline (null if no deadline or completed)
   *  - monthlyRateNeeded:  KES/month (dailyRateNeeded * 30) for "Save KES X/month by June" copy (null when no deadline)
   */
  private enrichWithProgress(goal: any) {
    const currentAmount = +Number(goal.currentAmount).toFixed(2);
    const targetAmount = +Number(goal.targetAmount).toFixed(2);
    const percentage =
      targetAmount > 0
        ? +Math.min((currentAmount / targetAmount) * 100, 100).toFixed(1)
        : 0;

    const msPerDay = 1000 * 60 * 60 * 24;

    let daysRemaining: number | null = null;
    if (goal.deadline) {
      daysRemaining = Math.ceil(
        (new Date(goal.deadline).getTime() - Date.now()) / msPerDay,
      );
    }

    // Days elapsed since the goal was created (min 1 to avoid division by zero)
    const daysElapsed = Math.max(
      1,
      Math.floor((Date.now() - new Date(goal.createdAt).getTime()) / msPerDay),
    );

    // How much the user needs to save per day to still reach the target on time
    let dailyRateNeeded: number | null = null;
    let monthlyRateNeeded: number | null = null;
    if (daysRemaining !== null && daysRemaining > 0 && percentage < 100) {
      const remaining = +(targetAmount - currentAmount).toFixed(2);
      dailyRateNeeded = +(remaining / daysRemaining).toFixed(2);
      monthlyRateNeeded = +(dailyRateNeeded * 30).toFixed(2);
    }

    let status:
      | "completed"
      | "on_track"
      | "at_risk"
      | "overdue"
      | "in_progress";

    if (percentage >= 100) {
      status = "completed";
    } else if (daysRemaining !== null && daysRemaining < 0) {
      status = "overdue";
    } else if (daysRemaining !== null && daysRemaining > 0) {
      // Compare actual savings rate vs required rate
      const actualDailyRate = currentAmount / daysElapsed;
      const requiredDailyRate = dailyRateNeeded ?? 0;

      // on_track if saving fast enough, or < 7 days but already above 90 %
      const isOnTrack =
        actualDailyRate >= requiredDailyRate ||
        (daysRemaining <= 7 && percentage >= 90);

      status = isOnTrack ? "on_track" : "at_risk";
    } else {
      // No deadline — just track progress
      status = "in_progress";
    }

    return {
      ...goal,
      currentAmount,
      targetAmount,
      percentage,
      status,
      daysRemaining,
      dailyRateNeeded,
      monthlyRateNeeded,
    };
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  /**
   * Create a new savings goal for the authenticated user.
   */
  async create(dto: CreateGoalDto, userId: string): Promise<any> {
    try {
      const goal = await this.db.goal.create({
        data: {
          userId,
          name: dto.name,
          description: dto.description ?? null,
          targetAmount: dto.targetAmount,
          currentAmount: 0,
          deadline: dto.deadline ? new Date(dto.deadline) : null,
        },
      });

      this.logger.log(
        `Goal created: "${goal.name}" (target KES ${dto.targetAmount}) — user ${userId}`,
      );
      return this.enrichWithProgress(goal);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "GoalsService.create");
    }
  }

  /**
   * Return all goals for the user, each with progress fields attached.
   * Ordered by deadline (soonest first, nulls last) so the most urgent goals
   * surface at the top of the list.
   */
  async findAll(userId: string, userRole: string): Promise<any[]> {
    try {
      const where = userRole === "ADMIN" ? {} : { userId };

      const goals = await this.db.goal.findMany({
        where,
        orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
      });

      return (goals as any[]).map((g) => this.enrichWithProgress(g));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "GoalsService.findAll");
    }
  }

  /**
   * Fetch a single goal with its progress summary.
   */
  async findById(id: string, userId: string, userRole: string): Promise<any> {
    try {
      const goal = await this.findAndAuthorise(id, userId, userRole);
      return this.enrichWithProgress(goal);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "GoalsService.findById");
    }
  }

  /**
   * Update goal metadata (name, description, targetAmount, deadline).
   * Ownership is verified before writing.
   */
  async update(
    id: string,
    dto: UpdateGoalDto,
    userId: string,
    userRole: string,
  ): Promise<any> {
    try {
      await this.findAndAuthorise(id, userId, userRole);

      const data: Record<string, any> = {};
      if (dto.name !== undefined) data.name = dto.name;
      if (dto.description !== undefined)
        data.description = dto.description ?? null;
      if (dto.targetAmount !== undefined) data.targetAmount = dto.targetAmount;
      if (dto.deadline !== undefined)
        data.deadline = dto.deadline ? new Date(dto.deadline) : null;

      const updated = await this.db.goal.update({ where: { id }, data });

      this.logger.log(`Goal updated: ${id} by user ${userId}`);
      return this.enrichWithProgress(updated);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "GoalsService.update");
    }
  }

  /**
   * Permanently delete a goal. Ownership verified before removing.
   */
  async delete(id: string, userId: string, userRole: string): Promise<void> {
    try {
      await this.findAndAuthorise(id, userId, userRole);
      await this.db.goal.delete({ where: { id } });
      this.logger.log(`Goal deleted: ${id} by user ${userId}`);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "GoalsService.delete");
    }
  }

  // ─── Allocate / Withdraw ───────────────────────────────────────────────────

  /**
   * Add an amount to a goal's currentAmount (record a savings contribution).
   * currentAmount is allowed to exceed targetAmount — the frontend can choose
   * to display it as "100 % complete" while showing the over-saved figure.
   */
  async allocate(
    id: string,
    dto: AllocateGoalDto,
    userId: string,
    userRole: string,
  ): Promise<any> {
    try {
      const goal = await this.findAndAuthorise(id, userId, userRole);

      const newAmount = +Number(
        Number(goal.currentAmount) + dto.amount,
      ).toFixed(2);

      const updated = await this.db.goal.update({
        where: { id },
        data: { currentAmount: newAmount },
      });

      this.logger.log(
        `Goal allocation: KES ${dto.amount} added to "${goal.name}" (${id}) — ` +
          `total now KES ${newAmount}`,
      );
      return this.enrichWithProgress(updated);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "GoalsService.allocate");
    }
  }

  /**
   * Withdraw an amount from a goal's currentAmount.
   *
   * Use cases: the user needs to dip into a savings pot, or a contribution was
   * entered in error. currentAmount cannot go below zero.
   */
  async withdraw(
    id: string,
    dto: WithdrawGoalDto,
    userId: string,
    userRole: string,
  ): Promise<any> {
    try {
      const goal = await this.findAndAuthorise(id, userId, userRole);

      const current = +Number(goal.currentAmount).toFixed(2);
      if (dto.amount > current) {
        throw new BadRequestException(
          `Cannot withdraw KES ${dto.amount} — the goal only has KES ${current} saved.`,
        );
      }

      const newAmount = +(current - dto.amount).toFixed(2);

      const updated = await this.db.goal.update({
        where: { id },
        data: { currentAmount: newAmount },
      });

      this.logger.log(
        `Goal withdrawal: KES ${dto.amount} removed from "${goal.name}" (${id}) — ` +
          `remaining KES ${newAmount}`,
      );
      return this.enrichWithProgress(updated);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "GoalsService.withdraw");
    }
  }

  // ─── Goal nudges ───────────────────────────────────────────────────────────

  /**
   * Build nudges like "Save KES X more per week to reach [goal name] 2 weeks early."
   * Only for goals that have a deadline, are not completed, and have more than 2 weeks left.
   * Extra weekly amount is computed so that if the user saves (required + extra) per week,
   * they would reach the target 2 weeks before the deadline.
   */
  async getGoalNudges(
    userId: string,
  ): Promise<
    { id: string; type: string; message: string; severity: string }[]
  > {
    try {
      const goals = await this.findAll(userId, "USER");
      const nudges: {
        id: string;
        type: string;
        message: string;
        severity: string;
      }[] = [];
      const WEEKS_EARLY = 2;
      const MIN_WEEKS_REMAINING = 2.5; // only suggest if at least ~2.5 weeks left

      for (const g of goals as any[]) {
        if (
          g.status === "completed" ||
          g.status === "overdue" ||
          g.status === "in_progress"
        )
          continue;
        if (g.daysRemaining == null || g.daysRemaining <= 0) continue;

        const weeksRemaining = g.daysRemaining / 7;
        if (weeksRemaining < MIN_WEEKS_REMAINING) continue;

        const remaining = +(
          Number(g.targetAmount) - Number(g.currentAmount)
        ).toFixed(2);
        if (remaining <= 0) continue;

        const requiredWeekly = remaining / weeksRemaining;
        const weeksToFinishEarly = weeksRemaining - WEEKS_EARLY;
        if (weeksToFinishEarly <= 0) continue;

        const weeklyToFinishEarly = remaining / weeksToFinishEarly;
        const extraPerWeek = +(weeklyToFinishEarly - requiredWeekly).toFixed(2);

        if (extraPerWeek > 0 && extraPerWeek < 1e6) {
          nudges.push({
            id: `goal_early_${g.id}`,
            type: "goal_save_early",
            message: `If you save KES ${extraPerWeek.toLocaleString()} more per week, you'll reach "${g.name}" ${WEEKS_EARLY} weeks early.`,
            severity: "info",
          });
        }
      }

      return nudges;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "GoalsService.getGoalNudges");
      return [];
    }
  }

  // ─── Dashboard ─────────────────────────────────────────────────────────────

  /**
   * Return a concise dashboard summary across all goals for the user:
   *  - counts by status
   *  - total saved vs total target
   *  - list of in-progress goals sorted by urgency
   */
  async getDashboard(userId: string, userRole: string) {
    try {
      const goals = await this.findAll(userId, userRole);

      const totalSaved = goals.reduce((s, g) => s + g.currentAmount, 0);
      const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);

      const counts = {
        total: goals.length,
        completed: goals.filter((g) => g.status === "completed").length,
        on_track: goals.filter((g) => g.status === "on_track").length,
        at_risk: goals.filter((g) => g.status === "at_risk").length,
        overdue: goals.filter((g) => g.status === "overdue").length,
        in_progress: goals.filter((g) => g.status === "in_progress").length,
      };

      return {
        summary: {
          totalSaved: +totalSaved.toFixed(2),
          totalTarget: +totalTarget.toFixed(2),
          overallPct:
            totalTarget > 0
              ? +((totalSaved / totalTarget) * 100).toFixed(1)
              : 0,
          counts,
        },
        goals,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "GoalsService.getDashboard");
    }
  }
}
