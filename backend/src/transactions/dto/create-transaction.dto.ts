import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsDateString,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTransactionDto {
  @ApiProperty({
    description: 'Transaction amount — must be a positive number with up to 2 decimal places',
    example: 250.0,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'amount must be a number with at most 2 decimal places' })
  @Min(0.01, { message: 'amount must be greater than 0' })
  amount: number;

  @ApiProperty({
    description: 'Whether money came in or went out',
    enum: ['income', 'expense'],
    example: 'expense',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['income', 'expense'], { message: 'type must be either "income" or "expense"' })
  type: string;

  @ApiPropertyOptional({
    description: 'Human-readable label shown in the transaction list',
    example: 'Lunch at Café Njema',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @ApiPropertyOptional({
    description: 'ISO 8601 date the transaction occurred (defaults to now)',
    example: '2026-02-18T12:00:00.000Z',
  })
  @IsOptional()
  @IsDateString({}, { message: 'date must be a valid ISO 8601 date string' })
  date?: string;

  @ApiPropertyOptional({
    description: 'Category CUID — must exist in the categories table',
    example: 'cldxyz123',
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiPropertyOptional({
    description:
      'Income source label for type=income (e.g. HELB, parents, part_time_job). ' +
      'Align with keys from onboarding incomeSources when possible.',
    example: 'helb',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  incomeSource?: string;
}
