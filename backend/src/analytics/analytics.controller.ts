import {
  Controller,
  Get,
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
} from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OnboardingGuard } from '../common/guards/onboarding.guard';
import { ErrorResponseDto } from '../auth/dto/auth-response.dto';
import type { AuthUser } from '../auth/strategies/jwt.strategy';

interface AuthRequest extends Express.Request {
  user: AuthUser;
}

/**
 * AnalyticsController — simple insights from aggregates (Phase 9).
 *
 * GET /analytics/insights returns precomputed messages like
 * "You spend more on weekends", "Food costs doubled this month".
 */
@ApiTags('Analytics')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, OnboardingGuard)
@Controller('analytics')
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('insights')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get simple insights',
    description:
      'Returns precomputed insights from your spending: e.g. "You spend more on weekends", ' +
      '"Food costs doubled this month". Use these to drive in-app tips and dashboards.',
  })
  @ApiResponse({ status: 200, description: 'List of insight messages.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid token.', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: 'Onboarding not completed.', type: ErrorResponseDto })
  async getInsights(@Request() req: AuthRequest) {
    try {
      const data = await this.analyticsService.getInsights(req.user.id);
      return { success: true, data };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error('Unexpected error in getInsights', error instanceof Error ? error.stack : String(error));
      throw new InternalServerErrorException('Could not retrieve insights.');
    }
  }
}
