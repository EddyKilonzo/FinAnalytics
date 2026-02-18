import { Module } from "@nestjs/common";
import { MlService } from "./ml.service";

/**
 * MlModule — provides MlService to any module that imports it.
 *
 * MlService is exported so TransactionsModule (and any future module) can
 * inject it without re-declaring the provider.
 */
@Module({
  providers: [MlService],
  exports: [MlService],
})
export class MlModule {}
