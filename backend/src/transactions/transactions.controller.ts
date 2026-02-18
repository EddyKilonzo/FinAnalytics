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
import { TransactionsService } from "./transactions.service";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { UpdateTransactionDto } from "./dto/update-transaction.dto";
import { TransactionQueryDto } from "./dto/transaction-query.dto";
import { CorrectCategoryDto } from "./dto/correct-category.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { OnboardingGuard } from "../common/guards/onboarding.guard";
import { ErrorResponseDto } from "../auth/dto/auth-response.dto";
import type { AuthUser } from "../auth/strategies/jwt.strategy";

interface AuthRequest extends Express.Request {
  user: AuthUser;
}

/**
 * TransactionsController — create, read, update, delete, and correct transactions.
 *
 * All routes require:
 *  1. A valid JWT (JwtAuthGuard)
 *  2. Completed onboarding (OnboardingGuard)
 *
 * Regular users see and modify only their own transactions.
 * Admins can view all transactions (ownership bypass in the service).
 */
@ApiTags("Transactions")
@ApiBearerAuth("access-token")
@UseGuards(JwtAuthGuard, OnboardingGuard)
@Controller("transactions")
export class TransactionsController {
  private readonly logger = new Logger(TransactionsController.name);

  constructor(private readonly transactionsService: TransactionsService) {}

  // ─── GET /api/v1/transactions ─────────────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "List transactions",
    description:
      "Returns a paginated list of the authenticated user's transactions. " +
      "Supports filtering by type (income/expense), categoryId, and date range.",
  })
  @ApiQuery({ name: "type", required: false, enum: ["income", "expense"] })
  @ApiQuery({ name: "categoryId", required: false, type: String })
  @ApiQuery({
    name: "dateFrom",
    required: false,
    type: String,
    example: "2026-01-01",
  })
  @ApiQuery({
    name: "dateTo",
    required: false,
    type: String,
    example: "2026-12-31",
  })
  @ApiQuery({ name: "page", required: false, type: Number, example: 1 })
  @ApiQuery({ name: "limit", required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: "Paginated transaction list." })
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
  async findAll(
    @Query() query: TransactionQueryDto,
    @Request() req: AuthRequest,
  ) {
    try {
      const { transactions, total, page, limit, totalPages } =
        await this.transactionsService.findAll(
          query,
          req.user.id,
          req.user.role,
        );

      return {
        success: true,
        data: transactions,
        meta: { total, page, limit, totalPages },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        "Unexpected error in findAll",
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        "Could not retrieve transactions. Please try again.",
      );
    }
  }

  // ─── GET /api/v1/transactions/summary ─────────────────────────────────────

  @Get("summary")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Dashboard summary",
    description:
      "Returns total income, total expenses, and net balance. Optionally filtered by date range.",
  })
  @ApiQuery({
    name: "dateFrom",
    required: false,
    type: String,
    example: "2026-01-01",
  })
  @ApiQuery({
    name: "dateTo",
    required: false,
    type: String,
    example: "2026-01-31",
  })
  @ApiResponse({ status: 200, description: "Financial summary." })
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
  async getSummary(
    @Query("dateFrom") dateFrom: string | undefined,
    @Query("dateTo") dateTo: string | undefined,
    @Request() req: AuthRequest,
  ) {
    try {
      const data = await this.transactionsService.getSummary(
        req.user.id,
        dateFrom,
        dateTo,
      );
      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        "Unexpected error in getSummary",
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        "Could not retrieve summary. Please try again.",
      );
    }
  }

  // ─── GET /api/v1/transactions/by-category ─────────────────────────────────

  @Get("by-category")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Spending by category",
    description:
      "Returns expense totals grouped by category — used for pie and bar charts. Sorted highest to lowest.",
  })
  @ApiQuery({ name: "dateFrom", required: false, type: String })
  @ApiQuery({ name: "dateTo", required: false, type: String })
  @ApiResponse({ status: 200, description: "Category breakdown." })
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
  async getByCategory(
    @Query("dateFrom") dateFrom: string | undefined,
    @Query("dateTo") dateTo: string | undefined,
    @Request() req: AuthRequest,
  ) {
    try {
      const data = await this.transactionsService.getSpendingByCategory(
        req.user.id,
        dateFrom,
        dateTo,
      );
      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        "Unexpected error in getByCategory",
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        "Could not retrieve category breakdown. Please try again.",
      );
    }
  }

  // ─── GET /api/v1/transactions/:id ─────────────────────────────────────────

  @Get(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Get a transaction by ID",
    description:
      "Response includes the ML-suggested category (if any) alongside the user-confirmed category.",
  })
  @ApiParam({ name: "id", description: "Transaction CUID" })
  @ApiResponse({ status: 200, description: "Transaction found." })
  @ApiResponse({
    status: 401,
    description: "Missing or invalid token.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Not your transaction or onboarding incomplete.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Not found.",
    type: ErrorResponseDto,
  })
  async findOne(@Param("id") id: string, @Request() req: AuthRequest) {
    try {
      const data = await this.transactionsService.findById(
        id,
        req.user.id,
        req.user.role,
      );
      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Unexpected error fetching transaction [${id}]`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        "Could not retrieve transaction. Please try again.",
      );
    }
  }

  // ─── POST /api/v1/transactions ────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Record a new transaction",
    description:
      "Creates a transaction and automatically suggests a category using the ML service. " +
      "The response includes suggestedCategory and categoryConfidence if the ML service " +
      "is available. Category suggestion does not delay the response — if ML is unavailable " +
      "the transaction is still created immediately.",
  })
  @ApiResponse({ status: 201, description: "Transaction created." })
  @ApiResponse({
    status: 400,
    description: "Validation error.",
    type: ErrorResponseDto,
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
  @ApiResponse({
    status: 404,
    description: "CategoryId not found.",
    type: ErrorResponseDto,
  })
  async create(@Body() dto: CreateTransactionDto, @Request() req: AuthRequest) {
    try {
      const data = await this.transactionsService.create(dto, req.user.id);
      return {
        success: true,
        message: "Transaction recorded successfully",
        data,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        "Unexpected error creating transaction",
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        "Could not record transaction. Please try again.",
      );
    }
  }

  // ─── PATCH /api/v1/transactions/:id ───────────────────────────────────────

  @Patch(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Update a transaction",
    description: "Only the owner (or an admin) may update a transaction.",
  })
  @ApiParam({ name: "id", description: "Transaction CUID" })
  @ApiResponse({ status: 200, description: "Transaction updated." })
  @ApiResponse({
    status: 400,
    description: "Validation error.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Missing or invalid token.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Not your transaction.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Not found.",
    type: ErrorResponseDto,
  })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateTransactionDto,
    @Request() req: AuthRequest,
  ) {
    try {
      const data = await this.transactionsService.update(
        id,
        dto,
        req.user.id,
        req.user.role,
      );
      return {
        success: true,
        message: "Transaction updated successfully",
        data,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Unexpected error updating transaction [${id}]`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        "Could not update transaction. Please try again.",
      );
    }
  }

  // ─── PATCH /api/v1/transactions/:id/correct-category ─────────────────────

  @Patch(":id/correct-category")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Correct the category on a transaction",
    description:
      "Lets the user override the ML-suggested (or previously chosen) category. " +
      "The correction is forwarded to the ML service as training feedback so future " +
      "predictions for similar descriptions improve. " +
      "The original suggestedCategory and confidence fields are preserved for auditability.",
  })
  @ApiParam({ name: "id", description: "Transaction CUID" })
  @ApiResponse({ status: 200, description: "Category corrected." })
  @ApiResponse({
    status: 400,
    description: "Invalid categoryId.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: "Missing or invalid token.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Not your transaction.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Transaction or category not found.",
    type: ErrorResponseDto,
  })
  async correctCategory(
    @Param("id") id: string,
    @Body() dto: CorrectCategoryDto,
    @Request() req: AuthRequest,
  ) {
    try {
      const data = await this.transactionsService.correctCategory(
        id,
        dto,
        req.user.id,
        req.user.role,
      );
      return {
        success: true,
        message:
          "Category corrected. Thank you — this helps improve future suggestions.",
        data,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Unexpected error correcting category on tx [${id}]`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        "Could not correct category. Please try again.",
      );
    }
  }

  // ─── DELETE /api/v1/transactions/:id ──────────────────────────────────────

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Delete a transaction",
    description: "Only the owner (or an admin) may delete a transaction.",
  })
  @ApiParam({ name: "id", description: "Transaction CUID" })
  @ApiResponse({
    status: 200,
    description: "Transaction deleted successfully.",
  })
  @ApiResponse({
    status: 401,
    description: "Missing or invalid token.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: "Not your transaction.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: "Not found.",
    type: ErrorResponseDto,
  })
  async remove(@Param("id") id: string, @Request() req: AuthRequest) {
    try {
      await this.transactionsService.delete(id, req.user.id, req.user.role);
      return { success: true, message: "Transaction deleted successfully" };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        `Unexpected error deleting transaction [${id}]`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException(
        "Could not delete transaction. Please try again.",
      );
    }
  }
}
