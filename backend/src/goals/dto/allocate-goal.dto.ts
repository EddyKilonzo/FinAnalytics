import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Body sent to POST /goals/:id/allocate.
 * Adds the specified amount to the goal's currentAmount.
 */
export class AllocateGoalDto {
  @ApiProperty({
    description: 'Amount to add toward the goal (must be positive)',
    example: 2500,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'amount must be a number with at most 2 decimal places' })
  @Min(0.01, { message: 'amount must be greater than 0' })
  amount: number;
}
