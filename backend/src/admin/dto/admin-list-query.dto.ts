import { IsOptional, IsString, IsInt, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Query parameters for admin list endpoints: pagination and optional user filter.
 */
export class AdminListQueryDto {
  @ApiPropertyOptional({ description: "Page number (1-based)", example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: "Items per page (max 100)", example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: "Filter by user CUID (only list data for this user)",
    example: "clxx123abc",
  })
  @IsOptional()
  @IsString()
  userId?: string;
}
