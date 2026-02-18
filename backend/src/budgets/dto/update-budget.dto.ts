import { PartialType } from '@nestjs/swagger';
import { CreateBudgetDto } from './create-budget.dto';

/** All CreateBudgetDto fields become optional for partial updates. */
export class UpdateBudgetDto extends PartialType(CreateBudgetDto) {}
