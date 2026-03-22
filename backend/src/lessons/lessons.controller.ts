import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  HttpException,
  InternalServerErrorException,
  BadRequestException,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { LessonsService, SUGGESTED_CONTEXTS } from "./lessons.service";
import { LessonAiService } from "./lesson-ai.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OnboardingGuard } from "../common/guards/onboarding.guard";
import { AdminGuard } from "../common/guards/admin.guard";
import { ErrorResponseDto } from "../auth/dto/auth-response.dto";
import type { AuthUser } from "../auth/strategies/jwt.strategy";

interface AuthRequest extends Express.Request {
  user: AuthUser;
}

/**
 * LessonsController — financial education content (5–7 min lessons).
 *
 * Content is stored in backend/data/lessons.json. All routes require JWT + onboarding.
 */
@ApiTags("Lessons")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard, OnboardingGuard)
@Controller("lessons")
export class LessonsController {
  private readonly logger = new Logger(LessonsController.name);

  constructor(
    private readonly lessonsService: LessonsService,
    private readonly lessonAiService: LessonAiService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "List financial lessons",
    description:
      "Returns metadata for all short financial lessons (budgeting, saving, debt, compound interest). " +
      "Use GET /lessons/:id to fetch the full body for a lesson.",
  })
  @ApiResponse({ status: 200, description: "List of lesson metadata." })
  @ApiResponse({
    status: 401,
    description: "Missing or invalid token.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Onboarding not completed.",
    type: ErrorResponseDto,
  })
  async findAll() {
    try {
      const data = this.lessonsService.findAll();
      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        "Unexpected error in lessons findAll",
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException("Could not retrieve lessons.");
    }
  }

  /**
   * Declared before :id so "suggested" is not captured as a lesson id.
   */
  @Get("suggested")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get contextually suggested lessons",
    description:
      "Returns lessons suggested for the given context and current user. " +
      "Contexts: helb_income (recent HELB income recorded → debt-awareness), first_goal (user has goals → saving-tips, budgeting-basics).",
  })
  @ApiQuery({
    name: "context",
    required: true,
    enum: SUGGESTED_CONTEXTS,
    description: "Context for suggestion: helb_income or first_goal",
  })
  @ApiResponse({
    status: 200,
    description: "List of suggested lessons with reason.",
  })
  @ApiResponse({
    status: 401,
    description: "Missing or invalid token.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Onboarding not completed.",
    type: ErrorResponseDto,
  })
  async getSuggested(
    @Query("context") context: string,
    @Request() req: AuthRequest,
  ) {
    try {
      const data = await this.lessonsService.getSuggested(
        context ?? "",
        req.user.id,
      );
      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        "Unexpected error in lessons getSuggested",
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        "Could not retrieve suggested lessons.",
      );
    }
  }

  @Get("leaderboard")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Get lesson completion leaderboard (top 10 users)" })
  @ApiResponse({ status: 200, description: "Ranked list of top learners." })
  async getLeaderboard() {
    try {
      const data = await this.lessonsService.getLeaderboard();
      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error("Error in getLeaderboard", error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException("Could not retrieve leaderboard.");
    }
  }

  @Get("progress")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get lesson completion progress",
    description: "Returns all lesson IDs the current user has completed.",
  })
  @ApiResponse({ status: 200, description: "List of completed lesson IDs with timestamps." })
  async getProgress(@Request() req: AuthRequest) {
    try {
      const data = await this.lessonsService.getProgress(req.user.id);
      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        "Unexpected error in lessons getProgress",
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException("Could not retrieve lesson progress.");
    }
  }

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get a lesson by ID or slug",
    description: "Returns the full lesson including body (markdown).",
  })
  @ApiParam({ name: "id", description: "Lesson id or slug" })
  @ApiResponse({ status: 200, description: "Lesson with body." })
  @ApiResponse({
    status: 401,
    description: "Missing or invalid token.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Onboarding not completed.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Lesson not found.",
    type: ErrorResponseDto,
  })
  async findOne(@Param("id") id: string) {
    try {
      const data = this.lessonsService.findOne(id);
      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Unexpected error fetching lesson [${id}]`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException("Could not retrieve lesson.");
    }
  }

  // ── Admin-only CRUD ────────────────────────────────────────────────────────

  @Post()
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "[Admin] Create a new lesson" })
  @ApiResponse({ status: 201, description: "Lesson created." })
  async createLesson(@Body() body: any) {
    try {
      const { title, slug, durationMinutes, topics, summary, body: lessonBody } = body;
      if (!title || !slug || !durationMinutes || !summary || !lessonBody) {
        throw new BadRequestException("title, slug, durationMinutes, summary, and body are required.");
      }
      const data = this.lessonsService.createLesson({
        title,
        slug,
        durationMinutes: Number(durationMinutes),
        topics: Array.isArray(topics) ? topics : [],
        summary,
        body: lessonBody,
      });
      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error("Error creating lesson", error instanceof Error ? error.stack : String(error));
      throw new BadRequestException(error instanceof Error ? error.message : "Could not create lesson.");
    }
  }

  @Patch(":id")
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "[Admin] Update a lesson by ID or slug" })
  @ApiResponse({ status: 200, description: "Lesson updated." })
  async updateLesson(@Param("id") id: string, @Body() body: any) {
    try {
      const data = this.lessonsService.updateLesson(id, body);
      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Error updating lesson [${id}]`, error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException("Could not update lesson.");
    }
  }

  // ── AI Draft management (Admin-only) ──────────────────────────────────────

  @Get("drafts")
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "[Admin] List all AI-generated lesson drafts" })
  async getDrafts() {
    return { success: true, data: this.lessonAiService.getAllDrafts() };
  }

  @Post("drafts/generate")
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "[Admin] Trigger immediate AI lesson draft generation" })
  async generateDraft(@Body() body: { topic?: string }) {
    try {
      const draft = await this.lessonAiService.generateDraftNow(body?.topic);
      return { success: true, data: draft };
    } catch (err) {
      throw new InternalServerErrorException(err instanceof Error ? err.message : "Generation failed.");
    }
  }

  @Post("drafts/:id/approve")
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "[Admin] Approve a draft and publish it as a lesson" })
  async approveDraft(@Param("id") id: string) {
    try {
      const draft = this.lessonAiService.approveDraft(id);
      if (!draft) throw new BadRequestException("Draft not found.");
      // Publish the draft as a real lesson
      const existing = this.lessonsService.findAll();
      if (!existing.find((l) => l.slug === draft.slug)) {
        this.lessonsService.createLesson({
          title: draft.title,
          slug: draft.slug,
          durationMinutes: draft.durationMinutes,
          topics: draft.topics,
          summary: draft.summary,
          body: draft.body,
        });
      }
      return { success: true, message: `Draft "${draft.title}" published.` };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException("Could not approve draft.");
    }
  }

  @Post("drafts/:id/reject")
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "[Admin] Reject a draft" })
  async rejectDraft(@Param("id") id: string) {
    this.lessonAiService.rejectDraft(id);
    return { success: true, message: "Draft rejected." };
  }

  @Delete("drafts/:id")
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "[Admin] Delete a draft permanently" })
  async deleteDraft(@Param("id") id: string) {
    this.lessonAiService.deleteDraft(id);
    return { success: true, message: "Draft deleted." };
  }

  @Delete(":id")
  @UseGuards(AdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "[Admin] Delete a lesson by ID or slug" })
  @ApiResponse({ status: 200, description: "Lesson deleted." })
  async deleteLesson(@Param("id") id: string) {
    try {
      this.lessonsService.deleteLesson(id);
      return { success: true, message: "Lesson deleted." };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Error deleting lesson [${id}]`, error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException("Could not delete lesson.");
    }
  }

  @Post(":id/complete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Mark a lesson as completed",
    description: "Records the current user as having completed the specified lesson.",
  })
  @ApiParam({ name: "id", description: "Lesson id or slug" })
  @ApiResponse({ status: 200, description: "Lesson marked as complete." })
  @ApiResponse({ status: 404, description: "Lesson not found.", type: ErrorResponseDto })
  async markComplete(
    @Param("id") id: string,
    @Request() req: AuthRequest,
    @Body() body: { correctAnswers?: number; totalQuestions?: number } = {},
  ) {
    try {
      await this.lessonsService.markComplete(id, req.user.id, {
        correctAnswers: body.correctAnswers ?? 0,
        totalQuestions: body.totalQuestions ?? 0,
      });
      return { success: true, message: "Lesson marked as complete" };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Unexpected error marking lesson complete [${id}]`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException("Could not mark lesson as complete.");
    }
  }
}
