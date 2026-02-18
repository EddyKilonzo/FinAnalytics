import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Body sent to POST /goals/:id/withdraw.
 * Reduces the goal's currentAmount (e.g. when the user needs to dip into savings).
 */
export class WithdrawGoalDto {
  @ApiProperty({
    description: 'Amount to withdraw from the goal (must be positive)',
    example: 1000,
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'amount must be a number with at most 2 decimal places' })
  @Min(0.01, { message: 'amount must be greater than 0' })
  amount: number;
}
