import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  HttpException,
  InternalServerErrorException,
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
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OnboardingGuard } from "../common/guards/onboarding.guard";
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

  constructor(private readonly lessonsService: LessonsService) {}

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
}
