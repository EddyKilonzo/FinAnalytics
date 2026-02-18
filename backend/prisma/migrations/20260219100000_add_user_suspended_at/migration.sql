-- AddColumn: suspendedAt on User (admin can suspend/unsuspend accounts)
ALTER TABLE "User" ADD COLUMN "suspendedAt" TIMESTAMP(3);
