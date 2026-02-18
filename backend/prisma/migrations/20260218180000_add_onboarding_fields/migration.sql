-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('FORM_FOUR_STUDENT', 'UNIVERSITY_STUDENT', 'RECENT_GRADUATE', 'YOUNG_PROFESSIONAL');

-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "userType"            "UserType",
  ADD COLUMN "incomeSources"       JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;
