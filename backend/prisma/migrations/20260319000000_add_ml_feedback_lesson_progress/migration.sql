-- CreateTable: MlFeedback — persists user category corrections for ML audit trail
CREATE TABLE "MlFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "correctedSlug" TEXT NOT NULL,
    "previousSlug" TEXT,
    "confidence" DECIMAL(5,4),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MlFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable: UserLessonProgress — tracks which financial lessons a user has completed
CREATE TABLE "UserLessonProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserLessonProgress_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey: MlFeedback.userId → User.id (cascade delete)
ALTER TABLE "MlFeedback" ADD CONSTRAINT "MlFeedback_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: UserLessonProgress.userId → User.id (cascade delete)
ALTER TABLE "UserLessonProgress" ADD CONSTRAINT "UserLessonProgress_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateUniqueIndex: prevent duplicate completion records per user/lesson
CREATE UNIQUE INDEX "UserLessonProgress_userId_lessonId_key"
    ON "UserLessonProgress"("userId", "lessonId");
