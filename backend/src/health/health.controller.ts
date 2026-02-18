import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService, HealthResult } from './health.service';

/**
 * HealthController — exposes a single public endpoint for readiness/liveness.
 *
 * No authentication. Used by Kubernetes, load balancers, and runbooks to
 * verify the backend and its integration with the Python ML service.
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Health check',
    description:
      'Returns backend and ML service status. ' +
      'status is "ok" when both database and ML service are reachable; "degraded" otherwise. ' +
      'Transaction creation still works when ML is unavailable (category suggestion is skipped).',
  })
  @ApiResponse({ status: 200, description: 'Health status (ok or degraded).' })
  async getHealth(): Promise<{ success: true; data: HealthResult }> {
    const data = await this.health.check();
    return { success: true, data };
  }
}
