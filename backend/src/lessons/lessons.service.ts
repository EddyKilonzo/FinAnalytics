import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PrismaService } from '../common/prisma.service';
import { handlePrismaError } from '../common/helpers/prisma-error.handler';
import { HttpException } from '@nestjs/common';

export interface Lesson {
  id: string;
  title: string;
  slug: string;
  durationMinutes: number;
  topics: string[];
  summary: string;
  body: string;
}

/** Suggested lesson item returned by getSuggested (contextual recommendations). */
export interface SuggestedLesson {
  lessonId: string;
  slug: string;
  reason: string;
}

/** Supported context values for GET /lessons/suggested?context=... */
export const SUGGESTED_CONTEXTS = ['helb_income', 'first_goal'] as const;
export type SuggestedContext = (typeof SUGGESTED_CONTEXTS)[number];

const LESSONS_PATH = join(process.cwd(), 'data', 'lessons.json');

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
      const raw = readFileSync(LESSONS_PATH, 'utf-8');
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
  findAll(): Pick<Lesson, 'id' | 'title' | 'slug' | 'durationMinutes' | 'topics' | 'summary'>[] {
    const list = this.loadLessons();
    return list.map(({ id, title, slug, durationMinutes, topics, summary }) => ({
      id,
      title,
      slug,
      durationMinutes,
      topics,
      summary,
    }));
  }

  /**
   * Get a single lesson by id or slug (includes full body).
   */
  findOne(idOrSlug: string): Lesson {
    const list = this.loadLessons();
    const lesson = list.find((l) => l.id === idOrSlug || l.slug === idOrSlug);
    if (!lesson) {
      throw new NotFoundException(`Lesson with id or slug "${idOrSlug}" was not found`);
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
  async getSuggested(context: string, userId: string): Promise<SuggestedLesson[]> {
    try {
      const normalized = context?.trim().toLowerCase();
      if (!normalized) {
        return [];
      }

      const list = this.loadLessons();
      const suggested: SuggestedLesson[] = [];

      if (normalized === 'helb_income') {
        const hasRecentHelbIncome = await this.hasRecentHelbIncome(userId);
        if (hasRecentHelbIncome) {
          const lesson = list.find((l) => l.slug === 'debt-awareness');
          if (lesson) {
            suggested.push({
              lessonId: lesson.id,
              slug: lesson.slug,
              reason: 'You recently recorded HELB income. Here’s how to stay on top of student debt.',
            });
          }
        }
      } else if (normalized === 'first_goal') {
        const goalCount = await this.getUserGoalCount(userId);
        if (goalCount > 0) {
          const savingTip = list.find((l) => l.slug === 'saving-tips');
          if (savingTip) {
            suggested.push({
              lessonId: savingTip.id,
              slug: savingTip.slug,
              reason: 'You’ve set a savings goal. These tips can help you reach it faster.',
            });
          }
          const budgeting = list.find((l) => l.slug === 'budgeting-basics');
          if (budgeting) {
            suggested.push({
              lessonId: budgeting.id,
              slug: budgeting.slug,
              reason: 'Budgeting helps you free up money for your goals.',
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
      handlePrismaError(error, this.logger, 'LessonsService.getSuggested');
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
          type: 'income',
          date: { gte: since },
          incomeSource: { contains: 'helb', mode: 'insensitive' },
        },
      });
      return count > 0;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      handlePrismaError(error, this.logger, 'LessonsService.hasRecentHelbIncome');
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
      handlePrismaError(error, this.logger, 'LessonsService.getUserGoalCount');
      return 0;
    }
  }
}
