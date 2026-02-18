import { PartialType } from "@nestjs/swagger";
import { CreateTransactionDto } from "./create-transaction.dto";

/**
 * All CreateTransactionDto fields become optional so callers only need
 * to send the specific fields they want to change.
 */
export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {}
