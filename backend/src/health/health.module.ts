import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { HealthService } from "./health.service";
import { MlModule } from "../ml/ml.module";

/**
 * HealthModule — exposes GET /api/v1/health that reports backend + ML status.
 *
 * Imports MlModule so HealthService can inject MlService and ping the Python
 * categorisation service. PrismaService is global so no need to import PrismaModule.
 */
@Module({
  imports: [MlModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
