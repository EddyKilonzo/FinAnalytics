import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminListQueryDto } from './dto/admin-list-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { ErrorResponseDto } from '../auth/dto/auth-response.dto';

/**
 * AdminController — endpoints visible and writable only by administrators.
 *
 * All routes require:
 *  1. Valid JWT (JwtAuthGuard)
 *  2. User role ADMIN (AdminGuard)
 *
 * Non-admins receive 403 Forbidden.
 */
@ApiTags('Admin')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, AdminGuard)
@Controller('admin')
export class AdminController {
  private readonly logger = new Logger(AdminController.name);

  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Admin dashboard stats [ADMIN]',
    description:
      'Returns counts: total users, transactions, budgets, goals, and recent signups (last 7 days).',
  })
  @ApiResponse({ status: 200, description: 'Dashboard statistics.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Requires ADMIN role.', type: ErrorResponseDto })
  async getDashboard() {
    try {
      const data = await this.adminService.getDashboard();
      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        'Unexpected error in admin getDashboard',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Could not load dashboard.');
    }
  }

  @Get('transactions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all transactions [ADMIN]',
    description:
      'Paginated list of every transaction. Use userId to filter by a single user.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: String, description: 'Filter by user CUID' })
  @ApiResponse({ status: 200, description: 'Paginated transactions with user info.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Requires ADMIN role.', type: ErrorResponseDto })
  async getAllTransactions(@Query() query: AdminListQueryDto) {
    try {
      const result = await this.adminService.getAllTransactions({
        page: query.page,
        limit: query.limit,
        userId: query.userId,
      });
      return {
        success: true,
        data: result.transactions,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        'Unexpected error in admin getAllTransactions',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Could not retrieve transactions.');
    }
  }

  @Get('budgets')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all budgets [ADMIN]',
    description: 'Paginated list of every budget. Use userId to filter by user.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated budgets with user info.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Requires ADMIN role.', type: ErrorResponseDto })
  async getAllBudgets(@Query() query: AdminListQueryDto) {
    try {
      const result = await this.adminService.getAllBudgets({
        page: query.page,
        limit: query.limit,
        userId: query.userId,
      });
      return {
        success: true,
        data: result.budgets,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        'Unexpected error in admin getAllBudgets',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Could not retrieve budgets.');
    }
  }

  @Get('goals')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List all goals [ADMIN]',
    description: 'Paginated list of every goal. Use userId to filter by user.',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated goals with user info.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Requires ADMIN role.', type: ErrorResponseDto })
  async getAllGoals(@Query() query: AdminListQueryDto) {
    try {
      const result = await this.adminService.getAllGoals({
        page: query.page,
        limit: query.limit,
        userId: query.userId,
      });
      return {
        success: true,
        data: result.goals,
        meta: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(
        'Unexpected error in admin getAllGoals',
        error instanceof Error ? error.stack : String(error),
      );
      throw new InternalServerErrorException('Could not retrieve goals.');
    }
  }
}
