import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * Body for PATCH /transactions/:id/correct-category.
 *
 * The user tells us which category this transaction *actually* belongs to
 * (overriding the ML suggestion or their own previous choice). We store the
 * correction and forward it to the ML service so future predictions improve.
 */
export class CorrectCategoryDto {
  @ApiProperty({
    description: 'The correct category ID (CUID) to assign to this transaction.',
    example: 'clx1234abcdef',
  })
  @IsString()
  @IsNotEmpty()
  categoryId!: string;
}
