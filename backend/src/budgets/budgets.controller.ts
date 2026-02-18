import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  HttpException,
  InternalServerErrorException,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { BudgetsService } from './budgets.service';
import { GoalsService } from '../goals/goals.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OnboardingGuard } from '../common/guards/onboarding.guard';
import { ErrorResponseDto } from '../auth/dto/auth-response.dto';
import type { AuthUser } from '../auth/strategies/jwt.strategy';

interface AuthRequest extends Express.Request {
  user: AuthUser;
}

/**
 * BudgetsController — allows users to set spending caps per category or overall.
 *
 * All routes require:
 *  1. A valid JWT (JwtAuthGuard)
 *  2. Completed onboarding (OnboardingGuard)
 *
 * Users see and manage only their own budgets (enforced in the service).
 * Admins can view all budgets.
 */
@ApiTags('Budgets')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, OnboardingGuard)
@Controller('budgets')
export class BudgetsController {
  private readonly logger = new Logger(BudgetsController.name);

  constructor(
    private readonly budgetsService: BudgetsService,
    private readonly goalsService: GoalsService,
  ) {}

  // ─── GET /api/v1/budgets/alerts ───────────────────────────────────────────

  /**
   * Declared before `:id` so NestJS doesn't treat "alerts" as an id param.
   */
  @Get('alerts')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get budget alerts and nudges',
    description:
      'Returns budgetAlerts (budgets at ≥80% or over limit) and nudges: weekend overspend, under budget, ' +
      'and goal nudges (e.g. "Save KES X more per week to reach goal 2 weeks early").',
  })
  @ApiResponse({
    status: 200,
    description: 'Object with budgetAlerts (array) and nudges (array of { id, type, message, severity }).',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Onboarding not completed.', type: ErrorResponseDto })
  async getAlerts(@Request() req: AuthRequest) {
    try {
      const goalNudges = await this.goalsService.getGoalNudges(req.user.id);
      const data = await this.budgetsService.getAlerts(req.user.id, req.user.role, goalNudges);
      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Unexpected error in getAlerts', error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException('Could not retrieve budget alerts. Please try again.');
    }
  }

  // ─── GET /api/v1/budgets ──────────────────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all budgets',
    description:
      'Returns all budgets for the authenticated user, each enriched with ' +
      'totalSpent, remaining, percentageUsed, and alertStatus.',
  })
  @ApiResponse({ status: 200, description: 'Budget list with live spending summaries.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Onboarding not completed.', type: ErrorResponseDto })
  async findAll(@Request() req: AuthRequest) {
    try {
      const data = await this.budgetsService.findAll(req.user.id, req.user.role);
      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Unexpected error in findAll', error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException('Could not retrieve budgets. Please try again.');
    }
  }

  // ─── GET /api/v1/budgets/:id ──────────────────────────────────────────────

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a budget by ID (includes live summary)' })
  @ApiParam({ name: 'id', description: 'Budget CUID' })
  @ApiResponse({ status: 200, description: 'Budget with spending summary.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Not your budget or onboarding incomplete.', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Not found.', type: ErrorResponseDto })
  async findOne(@Param('id') id: string, @Request() req: AuthRequest) {
    try {
      const data = await this.budgetsService.findById(id, req.user.id, req.user.role);
      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Unexpected error fetching budget [${id}]`, error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException('Could not retrieve budget. Please try again.');
    }
  }

  // ─── POST /api/v1/budgets ─────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a budget',
    description:
      'Set a spending limit for a category (or overall) for a given date window. ' +
      'period must be "month" or "semester".',
  })
  @ApiResponse({ status: 201, description: 'Budget created.' })
  @ApiResponse({ status: 400, description: 'Validation error.', type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Onboarding not completed.', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'CategoryId not found.', type: ErrorResponseDto })
  async create(@Body() dto: CreateBudgetDto, @Request() req: AuthRequest) {
    try {
      const data = await this.budgetsService.create(dto, req.user.id);
      return { success: true, message: 'Budget created successfully', data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Unexpected error creating budget', error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException('Could not create budget. Please try again.');
    }
  }

  // ─── PATCH /api/v1/budgets/:id ────────────────────────────────────────────

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a budget' })
  @ApiParam({ name: 'id', description: 'Budget CUID' })
  @ApiResponse({ status: 200, description: 'Budget updated.' })
  @ApiResponse({ status: 400, description: 'Validation error.', type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Not your budget.', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Not found.', type: ErrorResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBudgetDto,
    @Request() req: AuthRequest,
  ) {
    try {
      const data = await this.budgetsService.update(id, dto, req.user.id, req.user.role);
      return { success: true, message: 'Budget updated successfully', data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Unexpected error updating budget [${id}]`, error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException('Could not update budget. Please try again.');
    }
  }

  // ─── DELETE /api/v1/budgets/:id ───────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a budget' })
  @ApiParam({ name: 'id', description: 'Budget CUID' })
  @ApiResponse({ status: 200, description: 'Budget deleted successfully.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Not your budget.', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Not found.', type: ErrorResponseDto })
  async remove(@Param('id') id: string, @Request() req: AuthRequest) {
    try {
      await this.budgetsService.delete(id, req.user.id, req.user.role);
      return { success: true, message: 'Budget deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Unexpected error deleting budget [${id}]`, error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException('Could not delete budget. Please try again.');
    }
  }
}
