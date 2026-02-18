import { Injectable } from "@nestjs/common";
import { PrismaService } from "../common/prisma.service";
import { MlService } from "../ml/ml.service";

export interface HealthResult {
  status: "ok" | "degraded";
  timestamp: string;
  database: { connected: boolean };
  ml: { available: boolean; categoriesCount?: number };
}

/**
 * HealthService — aggregates backend and ML service status for readiness/liveness.
 *
 * Used by GET /api/v1/health (no auth) so load balancers and ops can verify
 * that the API and its dependency on the Python ML service are operational.
 */
@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ml: MlService,
  ) {}

  async check(): Promise<HealthResult> {
    const timestamp = new Date().toISOString();

    let databaseConnected = false;
    try {
      await (this.prisma as any).$queryRaw`SELECT 1`;
      databaseConnected = true;
    } catch {
      // DB down — status will be degraded
    }

    const mlStatus = await this.ml.ping();

    const status: HealthResult["status"] =
      databaseConnected && mlStatus.available ? "ok" : "degraded";

    return {
      status,
      timestamp,
      database: { connected: databaseConnected },
      ml: {
        available: mlStatus.available,
        ...(mlStatus.categoriesCount !== undefined && {
          categoriesCount: mlStatus.categoriesCount,
        }),
      },
    };
  }
}
