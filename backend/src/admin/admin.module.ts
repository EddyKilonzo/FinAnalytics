import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";

/**
 * AdminModule — dashboard and list endpoints for administrators only.
 * All routes are protected by JwtAuthGuard + AdminGuard.
 */
@Module({
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
