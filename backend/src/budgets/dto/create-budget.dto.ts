import {
  IsString,
  IsOptional,
  IsIn,
  IsDateString,
  IsNumber,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateBudgetDto {
  @ApiPropertyOptional({
    description:
      "Category CUID this budget applies to. " +
      'Leave blank to create an overall "all-spending" budget.',
    example: "cldxyz123",
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({
    description: "Maximum amount allowed to be spent within the period",
    example: 5000,
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: "limitAmount must be a number with up to 2 decimal places" },
  )
  @Min(0.01, { message: "limitAmount must be greater than 0" })
  limitAmount: number;

  @ApiProperty({
    description: "Budget period — monthly or semester-length",
    enum: ["month", "semester"],
    example: "month",
  })
  @IsString()
  @IsIn(["month", "semester"], {
    message: 'period must be either "month" or "semester"',
  })
  period: string;

  @ApiProperty({
    description: "ISO 8601 start date of this budget period",
    example: "2026-02-01T00:00:00.000Z",
  })
  @IsDateString({}, { message: "startAt must be a valid ISO 8601 date string" })
  startAt: string;

  @ApiProperty({
    description: "ISO 8601 end date of this budget period",
    example: "2026-02-28T23:59:59.000Z",
  })
  @IsDateString({}, { message: "endAt must be a valid ISO 8601 date string" })
  endAt: string;
}
