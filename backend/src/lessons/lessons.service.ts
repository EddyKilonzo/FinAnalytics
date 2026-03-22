import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { PrismaService } from "../common/prisma.service";
import { handlePrismaError } from "../common/helpers/prisma-error.handler";
import { HttpException } from "@nestjs/common";

export interface LessonProgressItem {
  lessonId: string;
  completedAt: Date;
}

export interface Lesson {
  id: string;
  title: string;
  slug: string;
  durationMinutes: number;
  topics: string[];
  category?: string;
  summary: string;
  body: string;
  quiz?: Array<{
    question: string;
    options: string[];
    correct: number;
    explanation: string;
  }>;
}

/** Suggested lesson item returned by getSuggested (contextual recommendations). */
export interface SuggestedLesson {
  lessonId: string;
  slug: string;
  reason: string;
}

/** Supported context values for GET /lessons/suggested?context=... */
export const SUGGESTED_CONTEXTS = ["helb_income", "first_goal"] as const;
export type SuggestedContext = (typeof SUGGESTED_CONTEXTS)[number];

const LESSONS_PATH = join(process.cwd(), "data", "lessons.json");

/** Days to look back for "recent" HELB income when suggesting debt-awareness lesson. */
const HELB_INCOME_DAYS_LOOKBACK = 30;

@Injectable()
export class LessonsService {
  private readonly logger = new Logger(LessonsService.name);
  private lessons: Lesson[] | null = null;

  constructor(private readonly prisma: PrismaService) {}

  private get db() {
    return this.prisma as any;
  }

  private loadLessons(): Lesson[] {
    if (this.lessons) return this.lessons;
    try {
      const raw = readFileSync(LESSONS_PATH, "utf-8");
      this.lessons = JSON.parse(raw) as Lesson[];
      return this.lessons;
    } catch (err) {
      this.logger.warn(
        `Could not load lessons from ${LESSONS_PATH}: ${err instanceof Error ? err.message : String(err)}. Returning empty list.`,
      );
      this.lessons = [];
      return this.lessons;
    }
  }

  /**
   * List all lessons (metadata only; body can be fetched by id for smaller list payload).
   */
  findAll(): Pick<
    Lesson,
    "id" | "title" | "slug" | "durationMinutes" | "topics" | "category" | "summary"
  >[] {
    const list = this.loadLessons();
    return list.map(
      ({ id, title, slug, durationMinutes, topics, category, summary }) => ({
        id,
        title,
        slug,
        durationMinutes,
        topics,
        category,
        summary,
      }),
    );
  }

  /**
   * Get a single lesson by id or slug (includes full body).
   */
  findOne(idOrSlug: string): Lesson {
    const list = this.loadLessons();
    const lesson = list.find((l) => l.id === idOrSlug || l.slug === idOrSlug);
    if (!lesson) {
      throw new NotFoundException(
        `Lesson with id or slug "${idOrSlug}" was not found`,
      );
    }
    return lesson;
  }

  /**
   * Return lessons suggested for the given context and user.
   * Used to show relevant content e.g. after recording HELB income or creating a first goal.
   *
   * Contexts:
   *  - helb_income: user has recorded income with source containing "helb" in the last 30 days → suggest debt-awareness.
   *  - first_goal: user has at least one goal → suggest saving-tips and/or budgeting-basics.
   */
  async getSuggested(
    context: string,
    userId: string,
  ): Promise<SuggestedLesson[]> {
    try {
      const normalized = context?.trim().toLowerCase();
      if (!normalized) {
        return [];
      }

      const list = this.loadLessons();
      const suggested: SuggestedLesson[] = [];

      if (normalized === "helb_income") {
        const hasRecentHelbIncome = await this.hasRecentHelbIncome(userId);
        if (hasRecentHelbIncome) {
          const lesson = list.find((l) => l.slug === "debt-awareness");
          if (lesson) {
            suggested.push({
              lessonId: lesson.id,
              slug: lesson.slug,
              reason:
                "You recently recorded HELB income. Here’s how to stay on top of student debt.",
            });
          }
        }
      } else if (normalized === "first_goal") {
        const goalCount = await this.getUserGoalCount(userId);
        if (goalCount > 0) {
          const savingTip = list.find((l) => l.slug === "saving-tips");
          if (savingTip) {
            suggested.push({
              lessonId: savingTip.id,
              slug: savingTip.slug,
              reason:
                "You’ve set a savings goal. These tips can help you reach it faster.",
            });
          }
          const budgeting = list.find((l) => l.slug === "budgeting-basics");
          if (budgeting) {
            suggested.push({
              lessonId: budgeting.id,
              slug: budgeting.slug,
              reason: "Budgeting helps you free up money for your goals.",
            });
          }
        }
      }

      return suggested;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.warn(
        `getSuggested failed for context=${context}, userId=${userId}: ${error instanceof Error ? error.message : String(error)}`,
      );
      handlePrismaError(error, this.logger, "LessonsService.getSuggested");
      return [];
    }
  }

  /**
   * True if the user has at least one income transaction with incomeSource
   * containing "helb" (case-insensitive) in the last HELB_INCOME_DAYS_LOOKBACK days.
   */
  private async hasRecentHelbIncome(userId: string): Promise<boolean> {
    try {
      const since = new Date();
      since.setDate(since.getDate() - HELB_INCOME_DAYS_LOOKBACK);

      const count = await this.db.transaction.count({
        where: {
          userId,
          type: "income",
          date: { gte: since },
          incomeSource: { contains: "helb", mode: "insensitive" },
        },
      });
      return count > 0;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(
        error,
        this.logger,
        "LessonsService.hasRecentHelbIncome",
      );
      return false;
    }
  }

  /**
   * Number of goals owned by the user (for "first_goal" context).
   */
  private async getUserGoalCount(userId: string): Promise<number> {
    try {
      return await this.db.goal.count({ where: { userId } });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "LessonsService.getUserGoalCount");
      return 0;
    }
  }

  /**
   * Mark a lesson as completed for a user. Upserts so re-completing is idempotent.
   */
  async markComplete(
    idOrSlug: string,
    userId: string,
    quiz: { correctAnswers: number; totalQuestions: number } = { correctAnswers: 0, totalQuestions: 0 },
  ): Promise<void> {
    try {
      const list = this.loadLessons();
      const lesson = list.find((l) => l.id === idOrSlug || l.slug === idOrSlug);
      if (!lesson) {
        throw new NotFoundException(`Lesson "${idOrSlug}" was not found`);
      }
      await this.db.userLessonProgress.upsert({
        where: { userId_lessonId: { userId, lessonId: lesson.id } },
        update: {
          completedAt: new Date(),
          correctAnswers: quiz.correctAnswers,
          totalQuestions: quiz.totalQuestions,
        },
        create: {
          userId,
          lessonId: lesson.id,
          correctAnswers: quiz.correctAnswers,
          totalQuestions: quiz.totalQuestions,
        },
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "LessonsService.markComplete");
    }
  }

  private saveLessons(list: Lesson[]): void {
    writeFileSync(LESSONS_PATH, JSON.stringify(list, null, 2), "utf-8");
    this.lessons = list;
  }

  createLesson(dto: Omit<Lesson, "id">): Lesson {
    const list = this.loadLessons();
    const id = dto.slug;
    if (list.find((l) => l.id === id || l.slug === dto.slug)) {
      throw new Error(`A lesson with slug "${dto.slug}" already exists.`);
    }
    const lesson: Lesson = { id, ...dto };
    list.push(lesson);
    this.saveLessons(list);
    return lesson;
  }

  updateLesson(idOrSlug: string, dto: Partial<Omit<Lesson, "id">>): Lesson {
    const list = this.loadLessons();
    const idx = list.findIndex((l) => l.id === idOrSlug || l.slug === idOrSlug);
    if (idx === -1) {
      throw new NotFoundException(`Lesson "${idOrSlug}" was not found`);
    }
    list[idx] = { ...list[idx], ...dto };
    this.saveLessons(list);
    return list[idx];
  }

  deleteLesson(idOrSlug: string): void {
    const list = this.loadLessons();
    const idx = list.findIndex((l) => l.id === idOrSlug || l.slug === idOrSlug);
    if (idx === -1) {
      throw new NotFoundException(`Lesson "${idOrSlug}" was not found`);
    }
    list.splice(idx, 1);
    this.saveLessons(list);
  }

  /**
   * Return the top-10 users ranked by lessons completed.
   */
  async getLeaderboard(): Promise<{ rank: number; name: string; lessonsCompleted: number; correctAnswers: number; score: number }[]> {
    try {
      const rows = await this.db.userLessonProgress.groupBy({
        by: ['userId'],
        _count: { lessonId: true },
        _sum: { correctAnswers: true },
        orderBy: [{ _count: { lessonId: 'desc' } }],
        take: 50, // fetch more, re-sort by composite score
      });
      const userIds = rows.map((r: any) => r.userId);
      const users = await this.db.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true },
      });
      const userMap = new Map(users.map((u: any) => [u.id, u]));

      interface ScoredEntry { name: string; lessonsCompleted: number; correctAnswers: number; score: number }

      const scored: ScoredEntry[] = rows.map((row: any) => {
        const lessonsCompleted: number = row._count.lessonId;
        const correctAnswers: number = row._sum.correctAnswers ?? 0;
        const score = lessonsCompleted * 10 + correctAnswers;
        const user = userMap.get(row.userId) as any;
        const fullName: string = user?.name ?? '';
        const parts = fullName.trim().split(/\s+/);
        const display = parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1][0]}.` : (parts[0] || 'Learner');
        return { name: display, lessonsCompleted, correctAnswers, score };
      });

      scored.sort((a: ScoredEntry, b: ScoredEntry) => b.score - a.score);

      return scored.slice(0, 10).map((entry: ScoredEntry, i: number) => ({ rank: i + 1, ...entry }));
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'LessonsService.getLeaderboard');
      return [];
    }
  }

  /**
   * Return all completed lesson IDs for the user with completion timestamps.
   */
  async getProgress(userId: string): Promise<LessonProgressItem[]> {
    try {
      const rows = await this.db.userLessonProgress.findMany({
        where: { userId },
        select: { lessonId: true, completedAt: true },
        orderBy: { completedAt: "desc" },
      });
      return rows as LessonProgressItem[];
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, "LessonsService.getProgress");
      return [];
    }
  }
}
