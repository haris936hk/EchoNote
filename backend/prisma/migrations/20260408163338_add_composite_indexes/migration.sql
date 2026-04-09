-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MeetingCategory" ADD VALUE 'RETROSPECTIVE';
ALTER TYPE "MeetingCategory" ADD VALUE 'INTERVIEW';

-- AlterTable
ALTER TABLE "action_items" ADD COLUMN     "confidence" TEXT DEFAULT 'medium',
ADD COLUMN     "sourceQuote" TEXT;

-- CreateIndex
CREATE INDEX "action_items_userId_status_idx" ON "action_items"("userId", "status");

-- CreateIndex
CREATE INDEX "user_activities_userId_createdAt_idx" ON "user_activities"("userId", "createdAt");
