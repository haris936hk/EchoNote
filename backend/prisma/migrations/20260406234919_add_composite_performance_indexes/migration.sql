/*
  Warnings:

  - You are about to drop the column `nlpKeyPhrases` on the `meetings` table. All the data in the column will be lost.
  - You are about to drop the column `nlpTopics` on the `meetings` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');

-- AlterTable
ALTER TABLE "meetings" DROP COLUMN "nlpKeyPhrases",
DROP COLUMN "nlpTopics",
ADD COLUMN     "transcriptConfidence" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "slackWebhookUrl" TEXT;

-- CreateTable
CREATE TABLE "action_items" (
    "id" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "assignee" TEXT,
    "deadline" TEXT,
    "priority" TEXT DEFAULT 'medium',
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "meetingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "action_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "action_items_meetingId_idx" ON "action_items"("meetingId");

-- CreateIndex
CREATE INDEX "action_items_userId_idx" ON "action_items"("userId");

-- CreateIndex
CREATE INDEX "action_items_status_idx" ON "action_items"("status");

-- CreateIndex
CREATE INDEX "meetings_userId_createdAt_idx" ON "meetings"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "meetings_userId_status_idx" ON "meetings"("userId", "status");

-- AddForeignKey
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_items" ADD CONSTRAINT "action_items_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
