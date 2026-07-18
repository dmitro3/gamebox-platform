-- 热点查询补充索引（保守优化：不改表结构，仅加索引）

-- 玩家按游戏筛注单
CREATE INDEX IF NOT EXISTS "Bet_playerId_gameId_createdAt_idx" ON "Bet"("playerId", "gameId", "createdAt");

-- 运营/报表按游戏统计注单
CREATE INDEX IF NOT EXISTS "Bet_gameId_createdAt_idx" ON "Bet"("gameId", "createdAt");

-- 服务重启扫描孤儿局（category=TABLE, state=PLAYING）
CREATE INDEX IF NOT EXISTS "GameRound_category_state_idx" ON "GameRound"("category", "state");
