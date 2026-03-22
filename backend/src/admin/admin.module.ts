import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { MlModule } from "../ml/ml.module";

/**
 * AdminModule — dashboard and list endpoints for administrators only.
 * All routes are protected by JwtAuthGuard + AdminGuard.
 */
@Module({
  imports: [MlModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
