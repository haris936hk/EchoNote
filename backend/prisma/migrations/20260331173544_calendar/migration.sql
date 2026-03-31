-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('UPLOADING', 'PENDING', 'PROCESSING_AUDIO', 'TRANSCRIBING', 'PROCESSING_NLP', 'SUMMARIZING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "MeetingCategory" AS ENUM ('SALES', 'PLANNING', 'STANDUP', 'ONE_ON_ONE', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "picture" TEXT,
    "googleId" TEXT NOT NULL,
    "googleAccessToken" TEXT,
    "googleRefreshToken" TEXT,
    "googleTokenExpiry" TIMESTAMP(3),
    "refreshToken" TEXT,
    "autoDeleteDays" INTEGER,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "MeetingCategory" NOT NULL DEFAULT 'OTHER',
    "status" "MeetingStatus" NOT NULL DEFAULT 'UPLOADING',
    "googleEventId" TEXT,
    "attendees" JSONB,
    "audioUrl" TEXT,
    "audioSize" INTEGER,
    "audioDuration" DOUBLE PRECISION,
    "audioFormat" TEXT,
    "transcriptText" TEXT,
    "transcriptWordCount" INTEGER,
    "nlpEntities" TEXT,
    "nlpKeyPhrases" TEXT,
    "nlpActionPatterns" TEXT,
    "nlpSentiment" TEXT,
    "nlpSentimentScore" DOUBLE PRECISION,
    "nlpTopics" JSONB,
    "summaryExecutive" TEXT,
    "summaryKeyDecisions" TEXT,
    "summaryActionItems" JSONB,
    "summaryNextSteps" TEXT,
    "summaryKeyTopics" JSONB,
    "summarySentiment" TEXT,
    "processingError" TEXT,
    "processingStartedAt" TIMESTAMP(3),
    "processingCompletedAt" TIMESTAMP(3),
    "processingDuration" DOUBLE PRECISION,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "queuedAt" TIMESTAMP(3),
    "lastRetryAt" TIMESTAMP(3),
    "audioDeletedAt" TIMESTAMP(3),
    "shouldDeleteAudioAt" TIMESTAMP(3),
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "processing_logs" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "details" JSONB,
    "duration" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "processing_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_googleId_idx" ON "users"("googleId");

-- CreateIndex
CREATE INDEX "meetings_userId_idx" ON "meetings"("userId");

-- CreateIndex
CREATE INDEX "meetings_status_idx" ON "meetings"("status");

-- CreateIndex
CREATE INDEX "meetings_category_idx" ON "meetings"("category");

-- CreateIndex
CREATE INDEX "meetings_createdAt_idx" ON "meetings"("createdAt");

-- CreateIndex
CREATE INDEX "meetings_shouldDeleteAudioAt_idx" ON "meetings"("shouldDeleteAudioAt");

-- CreateIndex
CREATE INDEX "meetings_status_queuedAt_idx" ON "meetings"("status", "queuedAt");

-- CreateIndex
CREATE INDEX "processing_logs_meetingId_idx" ON "processing_logs"("meetingId");

-- CreateIndex
CREATE INDEX "processing_logs_stage_idx" ON "processing_logs"("stage");

-- CreateIndex
CREATE INDEX "processing_logs_createdAt_idx" ON "processing_logs"("createdAt");

-- CreateIndex
CREATE INDEX "user_activities_userId_idx" ON "user_activities"("userId");

-- CreateIndex
CREATE INDEX "user_activities_action_idx" ON "user_activities"("action");

-- CreateIndex
CREATE INDEX "user_activities_createdAt_idx" ON "user_activities"("createdAt");

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
