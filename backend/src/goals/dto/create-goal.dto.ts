import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsNumber,
  Min,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateGoalDto {
  @ApiProperty({
    description: "Goal name shown in the dashboard",
    example: "Emergency Fund",
  })
  @IsString()
  @IsNotEmpty({ message: "name must not be empty" })
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    description: "Optional description or note for the goal",
    example: "Three months of living expenses in case of job loss",
    maxLength: 300,
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  description?: string;

  @ApiProperty({
    description: "Total amount the user wants to save (KES)",
    example: 50000,
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    { message: "targetAmount must be a number with at most 2 decimal places" },
  )
  @Min(0.01, { message: "targetAmount must be greater than 0" })
  targetAmount: number;

  @ApiPropertyOptional({
    description: 'ISO 8601 deadline — used to calculate "on track" status',
    example: "2026-12-31T00:00:00.000Z",
  })
  @IsOptional()
  @IsDateString(
    {},
    { message: "deadline must be a valid ISO 8601 date string" },
  )
  deadline?: string;
}
