-- AddColumn: incomeSource on Transaction (Phase 9 — label income by source: HELB, parents, part_time_job, etc.)
ALTER TABLE "Transaction" ADD COLUMN "incomeSource" TEXT;
