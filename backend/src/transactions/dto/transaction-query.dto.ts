import {
  IsOptional,
  IsString,
  IsIn,
  IsDateString,
  IsInt,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Query parameters for filtering and paginating the transaction list.
 * Every field is optional — omitting them returns all transactions for the user.
 */
export class TransactionQueryDto {
  @ApiPropertyOptional({
    description: "Filter by transaction type",
    enum: ["income", "expense"],
  })
  @IsOptional()
  @IsString()
  @IsIn(["income", "expense"])
  type?: string;

  @ApiPropertyOptional({
    description: "Filter by category CUID",
    example: "cldxyz123",
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description: "Return transactions on or after this date (ISO 8601)",
    example: "2026-01-01",
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: "Return transactions on or before this date (ISO 8601)",
    example: "2026-12-31",
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiPropertyOptional({ description: "Page number (starts at 1)", default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: "Results per page (max 100)",
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
