-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'BRANCH', 'AGENT', 'PROXY', 'PLAYER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "AccountOwnerType" AS ENUM ('PLATFORM', 'BRANCH', 'AGENT', 'PROXY', 'PLAYER');

-- CreateEnum
CREATE TYPE "LedgerBizType" AS ENUM ('RECHARGE', 'WITHDRAW', 'TRANSFER_OUT', 'TRANSFER_IN', 'BET', 'WIN', 'FEE', 'COMMISSION', 'REBATE', 'ACTIVITY', 'ADJUST');

-- CreateEnum
CREATE TYPE "RechargeType" AS ENUM ('UP', 'DOWN');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "GameCategory" AS ENUM ('LOTTERY', 'TABLE', 'SLOT', 'ARCADE');

-- CreateEnum
CREATE TYPE "GameStatus" AS ENUM ('ONLINE', 'OFFLINE', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "IssueStatus" AS ENUM ('PENDING', 'LOCKED', 'DRAWN', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('PENDING', 'WON', 'LOST', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('FIRST_DEPOSIT', 'WIN_STREAK', 'ACCUMULATE', 'VIP', 'PROMO', 'NEWBIE');

-- CreateEnum
CREATE TYPE "AppPlatform" AS ENUM ('ANDROID', 'IOS');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "nickname" TEXT NOT NULL,
    "avatar" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'PLAYER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "parentId" TEXT,
    "agentPath" TEXT NOT NULL DEFAULT '/',
    "depth" INTEGER NOT NULL DEFAULT 0,
    "promoCode" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "lastLoginIp" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "levelId" TEXT,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "rebateRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "teamFlowTotal" INTEGER NOT NULL DEFAULT 0,
    "teamFlowMonth" INTEGER NOT NULL DEFAULT 0,
    "pointsQuota" INTEGER NOT NULL DEFAULT 0,
    "pointsUsed" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentLevel" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "minTeamFlow" INTEGER NOT NULL DEFAULT 0,
    "commissionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accent" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AgentLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Room" (
    "id" TEXT NOT NULL,
    "roomNo" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "ownerAgentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "enabledGames" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsAccount" (
    "id" TEXT NOT NULL,
    "ownerType" "AccountOwnerType" NOT NULL,
    "ownerId" TEXT NOT NULL,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "frozen" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PointsAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PointsLedger" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "bizType" "LedgerBizType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "idempotencyKey" TEXT,
    "operatorId" TEXT,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PointsLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RechargeOrder" (
    "id" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "type" "RechargeType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "channel" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectReason" TEXT,
    "ledgerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RechargeOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "GameCategory" NOT NULL,
    "status" "GameStatus" NOT NULL DEFAULT 'OFFLINE',
    "iconUrl" TEXT,
    "entryUrl" TEXT,
    "minBet" INTEGER NOT NULL DEFAULT 1,
    "maxBet" INTEGER NOT NULL DEFAULT 1000000,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "drawIntervalSec" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameConfig" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "rtp" DOUBLE PRECISION NOT NULL DEFAULT 0.95,
    "payTable" JSONB NOT NULL,
    "params" JSONB,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LotteryIssue" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "issueNo" TEXT NOT NULL,
    "status" "IssueStatus" NOT NULL DEFAULT 'PENDING',
    "openAt" TIMESTAMP(3) NOT NULL,
    "lockAt" TIMESTAMP(3) NOT NULL,
    "drawNumbers" TEXT,
    "drawnAt" TIMESTAMP(3),
    "serverSeed" TEXT,
    "serverSeedHash" TEXT,
    "totalFlow" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LotteryIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameRound" (
    "id" TEXT NOT NULL,
    "roundNo" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "category" "GameCategory" NOT NULL,
    "configVer" INTEGER NOT NULL DEFAULT 1,
    "roomId" TEXT,
    "playerId" TEXT,
    "state" TEXT NOT NULL DEFAULT 'SETTLED',
    "totalFlow" INTEGER NOT NULL DEFAULT 0,
    "outcome" JSONB,
    "serverSeed" TEXT,
    "serverSeedHash" TEXT,
    "clientSeed" TEXT,
    "nonce" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "GameRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bet" (
    "id" TEXT NOT NULL,
    "betNo" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "issueId" TEXT,
    "roundId" TEXT,
    "betType" TEXT,
    "payload" JSONB,
    "amount" INTEGER NOT NULL,
    "odds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "payout" INTEGER NOT NULL DEFAULT 0,
    "status" "BetStatus" NOT NULL DEFAULT 'PENDING',
    "validFlow" INTEGER NOT NULL DEFAULT 0,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionRecord" (
    "id" TEXT NOT NULL,
    "beneficiaryId" TEXT NOT NULL,
    "sourceUserId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "sourceRoundId" TEXT,
    "baseFlow" INTEGER NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "amount" INTEGER NOT NULL,
    "ledgerId" TEXT,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RebateRecord" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "sourceRoundId" TEXT,
    "personalFlow" INTEGER NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "amount" INTEGER NOT NULL,
    "ledgerId" TEXT,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RebateRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "title" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "bannerUrl" TEXT,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'OFFLINE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityClaim" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "rewardPoints" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "ledgerId" TEXT,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CsMessage" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "roomNo" TEXT,
    "sender" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CsMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "playerId" TEXT,
    "content" TEXT NOT NULL,
    "contact" TEXT,
    "handled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppVersion" (
    "id" TEXT NOT NULL,
    "platform" "AppPlatform" NOT NULL,
    "versionName" TEXT NOT NULL,
    "versionCode" INTEGER NOT NULL,
    "downloadUrl" TEXT NOT NULL,
    "changelog" TEXT,
    "forceUpdate" BOOLEAN NOT NULL DEFAULT false,
    "isLatest" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'INFO',
    "targetId" TEXT,
    "detail" JSONB,
    "handled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RiskEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminLog" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "detail" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_uid_key" ON "User"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "User_promoCode_key" ON "User"("promoCode");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE INDEX "User_parentId_idx" ON "User"("parentId");

-- CreateIndex
CREATE INDEX "User_agentPath_idx" ON "User"("agentPath");

-- CreateIndex
CREATE UNIQUE INDEX "Agent_userId_key" ON "Agent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AgentLevel_code_key" ON "AgentLevel"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Room_roomNo_key" ON "Room"("roomNo");

-- CreateIndex
CREATE UNIQUE INDEX "PointsAccount_ownerId_key" ON "PointsAccount"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "PointsLedger_idempotencyKey_key" ON "PointsLedger"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PointsLedger_accountId_createdAt_idx" ON "PointsLedger"("accountId", "createdAt");

-- CreateIndex
CREATE INDEX "PointsLedger_refType_refId_idx" ON "PointsLedger"("refType", "refId");

-- CreateIndex
CREATE INDEX "PointsLedger_bizType_createdAt_idx" ON "PointsLedger"("bizType", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RechargeOrder_orderNo_key" ON "RechargeOrder"("orderNo");

-- CreateIndex
CREATE INDEX "RechargeOrder_playerId_createdAt_idx" ON "RechargeOrder"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "RechargeOrder_status_type_idx" ON "RechargeOrder"("status", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Game_code_key" ON "Game"("code");

-- CreateIndex
CREATE INDEX "GameConfig_gameId_active_idx" ON "GameConfig"("gameId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "GameConfig_gameId_version_key" ON "GameConfig"("gameId", "version");

-- CreateIndex
CREATE INDEX "LotteryIssue_gameId_status_openAt_idx" ON "LotteryIssue"("gameId", "status", "openAt");

-- CreateIndex
CREATE UNIQUE INDEX "LotteryIssue_gameId_issueNo_key" ON "LotteryIssue"("gameId", "issueNo");

-- CreateIndex
CREATE UNIQUE INDEX "GameRound_roundNo_key" ON "GameRound"("roundNo");

-- CreateIndex
CREATE INDEX "GameRound_gameId_startedAt_idx" ON "GameRound"("gameId", "startedAt");

-- CreateIndex
CREATE INDEX "GameRound_roomId_startedAt_idx" ON "GameRound"("roomId", "startedAt");

-- CreateIndex
CREATE INDEX "GameRound_playerId_startedAt_idx" ON "GameRound"("playerId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Bet_betNo_key" ON "Bet"("betNo");

-- CreateIndex
CREATE INDEX "Bet_playerId_createdAt_idx" ON "Bet"("playerId", "createdAt");

-- CreateIndex
CREATE INDEX "Bet_issueId_status_idx" ON "Bet"("issueId", "status");

-- CreateIndex
CREATE INDEX "Bet_roundId_status_idx" ON "Bet"("roundId", "status");

-- CreateIndex
CREATE INDEX "CommissionRecord_beneficiaryId_settledAt_idx" ON "CommissionRecord"("beneficiaryId", "settledAt");

-- CreateIndex
CREATE INDEX "CommissionRecord_sourceUserId_settledAt_idx" ON "CommissionRecord"("sourceUserId", "settledAt");

-- CreateIndex
CREATE INDEX "RebateRecord_playerId_settledAt_idx" ON "RebateRecord"("playerId", "settledAt");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_code_key" ON "Activity"("code");

-- CreateIndex
CREATE INDEX "Activity_type_status_idx" ON "Activity"("type", "status");

-- CreateIndex
CREATE INDEX "ActivityClaim_activityId_playerId_idx" ON "ActivityClaim"("activityId", "playerId");

-- CreateIndex
CREATE INDEX "ActivityClaim_playerId_claimedAt_idx" ON "ActivityClaim"("playerId", "claimedAt");

-- CreateIndex
CREATE INDEX "CsMessage_playerId_roomNo_createdAt_idx" ON "CsMessage"("playerId", "roomNo", "createdAt");

-- CreateIndex
CREATE INDEX "Feedback_handled_createdAt_idx" ON "Feedback"("handled", "createdAt");

-- CreateIndex
CREATE INDEX "AppVersion_platform_isLatest_idx" ON "AppVersion"("platform", "isLatest");

-- CreateIndex
CREATE INDEX "RiskEvent_type_level_createdAt_idx" ON "RiskEvent"("type", "level", "createdAt");

-- CreateIndex
CREATE INDEX "AdminLog_operatorId_createdAt_idx" ON "AdminLog"("operatorId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminLog_action_createdAt_idx" ON "AdminLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agent" ADD CONSTRAINT "Agent_levelId_fkey" FOREIGN KEY ("levelId") REFERENCES "AgentLevel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Room" ADD CONSTRAINT "Room_ownerAgentId_fkey" FOREIGN KEY ("ownerAgentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsLedger" ADD CONSTRAINT "PointsLedger_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "PointsAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PointsLedger" ADD CONSTRAINT "PointsLedger_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RechargeOrder" ADD CONSTRAINT "RechargeOrder_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RechargeOrder" ADD CONSTRAINT "RechargeOrder_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameConfig" ADD CONSTRAINT "GameConfig_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LotteryIssue" ADD CONSTRAINT "LotteryIssue_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameRound" ADD CONSTRAINT "GameRound_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "LotteryIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "GameRound"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRecord" ADD CONSTRAINT "CommissionRecord_beneficiaryId_fkey" FOREIGN KEY ("beneficiaryId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRecord" ADD CONSTRAINT "CommissionRecord_sourceUserId_fkey" FOREIGN KEY ("sourceUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRecord" ADD CONSTRAINT "CommissionRecord_sourceRoundId_fkey" FOREIGN KEY ("sourceRoundId") REFERENCES "GameRound"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RebateRecord" ADD CONSTRAINT "RebateRecord_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RebateRecord" ADD CONSTRAINT "RebateRecord_sourceRoundId_fkey" FOREIGN KEY ("sourceRoundId") REFERENCES "GameRound"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityClaim" ADD CONSTRAINT "ActivityClaim_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityClaim" ADD CONSTRAINT "ActivityClaim_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CsMessage" ADD CONSTRAINT "CsMessage_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminLog" ADD CONSTRAINT "AdminLog_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
