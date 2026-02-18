import { Module } from "@nestjs/common";
import { CategoriesService } from "./categories.service";
import { CategoriesController } from "./categories.controller";

@Module({
  controllers: [CategoriesController],
  providers: [CategoriesService],
  // Export the service so TransactionsModule and BudgetsModule can validate
  // that a categoryId actually exists before creating their records.
  exports: [CategoriesService],
})
export class CategoriesModule {}
