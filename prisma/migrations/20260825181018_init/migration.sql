-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('LEETCODE', 'CODEFORCES', 'HACKERRANK', 'GEEKSFORGEEKS', 'OTHER');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "RevisionStatus" AS ENUM ('SCHEDULED', 'DUE', 'COMPLETED', 'OVERDUE', 'SKIPPED');

-- CreateEnum
CREATE TYPE "RecallResult" AS ENUM ('FORGOT', 'HARD', 'GOOD', 'EASY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "dailyGoal" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Problem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "problemNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "platform" "Platform" NOT NULL DEFAULT 'LEETCODE',
    "url" TEXT,
    "difficulty" "Difficulty",
    "topic" TEXT,
    "notes" TEXT,
    "solutionUrl" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "registeredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Problem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevisionSchedule" (
    "id" TEXT NOT NULL,
    "problemId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "intervalDays" INTEGER NOT NULL,
    "scheduledDate" TIMESTAMPTZ(6) NOT NULL,
    "status" "RevisionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "completedAt" TIMESTAMP(3),
    "result" "RecallResult",
    "notes" TEXT,
    "timeSpentSec" INTEGER,
    "solutionViewed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevisionSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RevisionSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "intervals" INTEGER[] DEFAULT ARRAY[3, 7, 15, 21, 60, 90]::INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevisionSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Problem_userId_registeredAt_idx" ON "Problem"("userId", "registeredAt");

-- CreateIndex
CREATE UNIQUE INDEX "Problem_userId_platform_problemNumber_key" ON "Problem"("userId", "platform", "problemNumber");

-- CreateIndex
CREATE INDEX "RevisionSchedule_scheduledDate_status_idx" ON "RevisionSchedule"("scheduledDate", "status");

-- CreateIndex
CREATE UNIQUE INDEX "RevisionSchedule_problemId_revisionNumber_key" ON "RevisionSchedule"("problemId", "revisionNumber");

-- CreateIndex
CREATE UNIQUE INDEX "RevisionSettings_userId_key" ON "RevisionSettings"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionSchedule" ADD CONSTRAINT "RevisionSchedule_problemId_fkey" FOREIGN KEY ("problemId") REFERENCES "Problem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RevisionSettings" ADD CONSTRAINT "RevisionSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
