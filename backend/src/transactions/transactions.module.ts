import { Module } from "@nestjs/common";
import { TransactionsService } from "./transactions.service";
import { TransactionsController } from "./transactions.controller";
import { MlModule } from "../ml/ml.module";

@Module({
  imports: [
    // MlModule provides MlService for automatic category suggestions
    // and feedback forwarding on user corrections.
    MlModule,
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  // Export the service so BudgetsModule can query transaction totals
  // when computing spending-vs-limit summaries.
  exports: [TransactionsService],
})
export class TransactionsModule {}
