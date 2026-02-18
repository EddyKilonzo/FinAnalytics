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
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { AllocateGoalDto } from './dto/allocate-goal.dto';
import { WithdrawGoalDto } from './dto/withdraw-goal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OnboardingGuard } from '../common/guards/onboarding.guard';
import { ErrorResponseDto } from '../auth/dto/auth-response.dto';
import type { AuthUser } from '../auth/strategies/jwt.strategy';

interface AuthRequest extends Express.Request {
  user: AuthUser;
}

/**
 * GoalsController — tracks progress toward savings targets.
 *
 * All routes require:
 *  1. A valid JWT (JwtAuthGuard)
 *  2. Completed onboarding (OnboardingGuard)
 *
 * Users manage only their own goals (ownership enforced in the service).
 * Each response includes computed progress fields (percentage, status, daysRemaining).
 */
@ApiTags('Goals')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, OnboardingGuard)
@Controller('goals')
export class GoalsController {
  private readonly logger = new Logger(GoalsController.name);

  constructor(private readonly goalsService: GoalsService) {}

  // ─── GET /api/v1/goals/dashboard ─────────────────────────────────────────

  /**
   * Declared before `:id` so NestJS doesn't treat "dashboard" as an id param.
   */
  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Goals dashboard',
    description:
      'Returns an overview of all goals — total saved vs total target, ' +
      'counts by status (completed, on_track, at_risk, overdue), and the full list.',
  })
  @ApiResponse({ status: 200, description: 'Dashboard summary and goal list.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Onboarding not completed.', type: ErrorResponseDto })
  async getDashboard(@Request() req: AuthRequest) {
    try {
      const data = await this.goalsService.getDashboard(req.user.id, req.user.role);
      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Unexpected error in getDashboard', error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException('Could not retrieve goals dashboard. Please try again.');
    }
  }

  // ─── GET /api/v1/goals ───────────────────────────────────────────────────

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all goals',
    description:
      'Returns goals sorted by deadline (soonest first). Each goal includes ' +
      'percentage, status, and daysRemaining for progress bars.',
  })
  @ApiResponse({ status: 200, description: 'Goal list with progress fields.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Onboarding not completed.', type: ErrorResponseDto })
  async findAll(@Request() req: AuthRequest) {
    try {
      const data = await this.goalsService.findAll(req.user.id, req.user.role);
      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Unexpected error in findAll', error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException('Could not retrieve goals. Please try again.');
    }
  }

  // ─── GET /api/v1/goals/:id ───────────────────────────────────────────────

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a goal by ID' })
  @ApiParam({ name: 'id', description: 'Goal CUID' })
  @ApiResponse({ status: 200, description: 'Goal with progress fields.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Not your goal or onboarding incomplete.', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Not found.', type: ErrorResponseDto })
  async findOne(@Param('id') id: string, @Request() req: AuthRequest) {
    try {
      const data = await this.goalsService.findById(id, req.user.id, req.user.role);
      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Unexpected error fetching goal [${id}]`, error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException('Could not retrieve goal. Please try again.');
    }
  }

  // ─── POST /api/v1/goals ──────────────────────────────────────────────────

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a savings goal',
    description: 'Name, targetAmount, and an optional deadline.',
  })
  @ApiResponse({ status: 201, description: 'Goal created.' })
  @ApiResponse({ status: 400, description: 'Validation error.', type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Onboarding not completed.', type: ErrorResponseDto })
  async create(@Body() dto: CreateGoalDto, @Request() req: AuthRequest) {
    try {
      const data = await this.goalsService.create(dto, req.user.id);
      return { success: true, message: 'Goal created successfully', data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Unexpected error creating goal', error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException('Could not create goal. Please try again.');
    }
  }

  // ─── POST /api/v1/goals/:id/allocate ─────────────────────────────────────

  @Post(':id/allocate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Add savings toward a goal',
    description:
      'Increases currentAmount by the given amount. ' +
      'Records a contribution — the goal can exceed its target (shown as 100 %).',
  })
  @ApiParam({ name: 'id', description: 'Goal CUID' })
  @ApiResponse({ status: 200, description: 'Savings allocated. Returns updated goal.' })
  @ApiResponse({ status: 400, description: 'Validation error.', type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Not your goal.', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Not found.', type: ErrorResponseDto })
  async allocate(
    @Param('id') id: string,
    @Body() dto: AllocateGoalDto,
    @Request() req: AuthRequest,
  ) {
    try {
      const data = await this.goalsService.allocate(id, dto, req.user.id, req.user.role);
      return { success: true, message: `KES ${dto.amount} allocated successfully`, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Unexpected error allocating to goal [${id}]`, error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException('Could not allocate savings. Please try again.');
    }
  }

  // ─── POST /api/v1/goals/:id/withdraw ─────────────────────────────────────

  @Post(':id/withdraw')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Withdraw savings from a goal',
    description:
      'Reduces currentAmount by the given amount. ' +
      'Use when the user needs to dip into savings or to reverse an incorrect allocation. ' +
      'currentAmount cannot go below zero — the request is rejected with 400 if the ' +
      'withdrawal exceeds the available balance.',
  })
  @ApiParam({ name: 'id', description: 'Goal CUID' })
  @ApiResponse({ status: 200, description: 'Withdrawal applied. Returns updated goal.' })
  @ApiResponse({ status: 400, description: 'Amount exceeds available balance.', type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Not your goal.', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Not found.', type: ErrorResponseDto })
  async withdraw(
    @Param('id') id: string,
    @Body() dto: WithdrawGoalDto,
    @Request() req: AuthRequest,
  ) {
    try {
      const data = await this.goalsService.withdraw(id, dto, req.user.id, req.user.role);
      return { success: true, message: `KES ${dto.amount} withdrawn from goal`, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Unexpected error withdrawing from goal [${id}]`, error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException('Could not process withdrawal. Please try again.');
    }
  }

  // ─── PATCH /api/v1/goals/:id ─────────────────────────────────────────────

  @Patch(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a goal (name, targetAmount, deadline)' })
  @ApiParam({ name: 'id', description: 'Goal CUID' })
  @ApiResponse({ status: 200, description: 'Goal updated.' })
  @ApiResponse({ status: 400, description: 'Validation error.', type: ErrorResponseDto })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Not your goal.', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Not found.', type: ErrorResponseDto })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
    @Request() req: AuthRequest,
  ) {
    try {
      const data = await this.goalsService.update(id, dto, req.user.id, req.user.role);
      return { success: true, message: 'Goal updated successfully', data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Unexpected error updating goal [${id}]`, error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException('Could not update goal. Please try again.');
    }
  }

  // ─── DELETE /api/v1/goals/:id ────────────────────────────────────────────

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a goal' })
  @ApiParam({ name: 'id', description: 'Goal CUID' })
  @ApiResponse({ status: 200, description: 'Goal deleted successfully.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Not your goal.', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: 'Not found.', type: ErrorResponseDto })
  async remove(@Param('id') id: string, @Request() req: AuthRequest) {
    try {
      await this.goalsService.delete(id, req.user.id, req.user.role);
      return { success: true, message: 'Goal deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`Unexpected error deleting goal [${id}]`, error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException('Could not delete goal. Please try again.');
    }
  }
}
