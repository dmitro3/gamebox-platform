-- 冻结彩票期号配置版本
ALTER TABLE "LotteryIssue"
ADD COLUMN "configVer" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "Bet"
ADD COLUMN "clientRequestId" TEXT;

CREATE UNIQUE INDEX "Bet_clientRequestId_key"
ON "Bet"("clientRequestId");

-- 活动奖励领取必须由数据库保证唯一
DROP INDEX IF EXISTS "ActivityClaim_activityId_playerId_idx";
CREATE UNIQUE INDEX "ActivityClaim_activityId_playerId_key"
ON "ActivityClaim"("activityId", "playerId");

-- 麻将等电子特色玩法的跨请求会话
CREATE TABLE "SlotFeatureSession" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "lockedBetAmount" INTEGER NOT NULL,
    "spinsRemaining" INTEGER NOT NULL,
    "totalWin" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlotFeatureSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SlotFeatureSession_playerId_gameId_status_idx"
ON "SlotFeatureSession"("playerId", "gameId", "status");

CREATE INDEX "SlotFeatureSession_expiresAt_status_idx"
ON "SlotFeatureSession"("expiresAt", "status");

ALTER TABLE "SlotFeatureSession"
ADD CONSTRAINT "SlotFeatureSession_playerId_fkey"
FOREIGN KEY ("playerId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SlotFeatureSession"
ADD CONSTRAINT "SlotFeatureSession_gameId_fkey"
FOREIGN KEY ("gameId") REFERENCES "Game"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
