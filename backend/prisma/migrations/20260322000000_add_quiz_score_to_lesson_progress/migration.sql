-- Add quiz score columns to UserLessonProgress
ALTER TABLE "UserLessonProgress" ADD COLUMN IF NOT EXISTS "correctAnswers" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "UserLessonProgress" ADD COLUMN IF NOT EXISTS "totalQuestions" INTEGER NOT NULL DEFAULT 0;
