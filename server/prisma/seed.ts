/**
 * 初始化种子数据。运行：pnpm --filter @gamebox/server prisma:seed
 * 内容：
 *   - 平台积分账户(PLATFORM)
 *   - 平台管理员账号(ADMIN)  密码：Admin@123456
 *   - 代理等级 V1-V5
 *   - 游戏目录（3 款）+ 各自 active 的 GameConfig（爆率/赔率）
 *
 * 注意：上线前请勿在生产执行含测试账号的 seed，或改写强密码。
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const AGENT_LEVELS = [
  { code: 'V1', name: '青铜代理', minTeamFlow: 0,      commissionRate: 0.005, accent: '#9c8158' },
  { code: 'V2', name: '白银代理', minTeamFlow: 10000,  commissionRate: 0.008, accent: '#c0c0c0' },
  { code: 'V3', name: '黄金代理', minTeamFlow: 50000,  commissionRate: 0.012, accent: '#d4af37' },
  { code: 'V4', name: '铂金代理', minTeamFlow: 200000, commissionRate: 0.016, accent: '#9aa0e8' },
  { code: 'V5', name: '钻石代理', minTeamFlow: 500000, commissionRate: 0.020, accent: '#88e8ff' },
];

const GAMES = [
  {
    code: 'lucky-wheel', name: '幸运转盘', category: 'SLOT' as const,
    status: 'ONLINE' as const, sortOrder: 1, minBet: 1, maxBet: 10000,
    rtp: 0.95,
    payTable: [
      { label: '谢谢参与', multiplier: 0,  weight: 40 },
      { label: '×1',       multiplier: 1,  weight: 25 },
      { label: '×2',       multiplier: 2,  weight: 15 },
      { label: '×5',       multiplier: 5,  weight: 10 },
      { label: '×10',      multiplier: 10, weight: 6  },
      { label: '×20',      multiplier: 20, weight: 3  },
      { label: '×50',      multiplier: 50, weight: 1  },
    ],
  },
  {
    code: 'ffc', name: '分分彩', category: 'LOTTERY' as const,
    status: 'ONLINE' as const, sortOrder: 2, drawIntervalSec: 60, minBet: 1, maxBet: 10000,
    rtp: 0.95,
    payTable: {
      big:   { multiplier: 1.98, desc: '总和 23-45' },
      small: { multiplier: 1.98, desc: '总和 0-22'  },
      odd:   { multiplier: 1.98, desc: '总和为奇数' },
      even:  { multiplier: 1.98, desc: '总和为偶数' },
      exact: { multiplier: 9.00, desc: '猜中个位数字' },
    },
  },
  {
    code: 'slots-classic', name: '经典老虎机', category: 'SLOT' as const,
    status: 'ONLINE' as const, sortOrder: 3, minBet: 1, maxBet: 5000,
    rtp: 0.96,
    payTable: [
      { label: '谢谢参与', multiplier: 0,   weight: 35 },
      { label: '×1',       multiplier: 1,   weight: 25 },
      { label: '×2',       multiplier: 2,   weight: 18 },
      { label: '×5',       multiplier: 5,   weight: 12 },
      { label: '×10',      multiplier: 10,  weight: 6  },
      { label: '×25',      multiplier: 25,  weight: 3  },
      { label: '×100',     multiplier: 100, weight: 1  },
    ],
  },
  // ── 更多 SLOT ──
  {
    code: 'slots-queen', name: '赏金女王', category: 'SLOT' as const,
    status: 'ONLINE' as const, sortOrder: 4, minBet: 1, maxBet: 5000,
    rtp: 0.96,
    payTable: [
      { label: '谢谢参与', multiplier: 0,   weight: 30 },
      { label: '×1',       multiplier: 1,   weight: 25 },
      { label: '×3',       multiplier: 3,   weight: 18 },
      { label: '×8',       multiplier: 8,   weight: 12 },
      { label: '×15',      multiplier: 15,  weight: 8  },
      { label: '×50',      multiplier: 50,  weight: 5  },
      { label: '×200',     multiplier: 200, weight: 2  },
    ],
  },
  {
    code: 'slots-mahjong', name: '麻将胡了', category: 'SLOT' as const,
    status: 'ONLINE' as const, sortOrder: 5, minBet: 1, maxBet: 10000,
    rtp: 0.96,
    payTable: [
      { label: '和了！',  multiplier: 0,    weight: 28 },
      { label: '×1',     multiplier: 1,    weight: 26 },
      { label: '×2',     multiplier: 2,    weight: 18 },
      { label: '×5',     multiplier: 5,    weight: 12 },
      { label: '×10',    multiplier: 10,   weight: 8  },
      { label: '×30',    multiplier: 30,   weight: 5  },
      { label: '天胡×88', multiplier: 88,  weight: 2  },
      { label: '地胡×188', multiplier: 188, weight: 1 },
    ],
  },
  // ── 棋牌类游戏 ──
  {
    code: 'dragon-tiger', name: '龙虎斗', category: 'TABLE' as const,
    status: 'ONLINE' as const, sortOrder: 10, minBet: 10, maxBet: 100_000,
    rtp: 0.965,
    payTable: [
      { label: '龙',    multiplier: 2,  weight: 46 },
      { label: '虎',    multiplier: 2,  weight: 46 },
      { label: '和(×9)', multiplier: 9, weight: 8  },
    ],
  },
  // ── 彩票类游戏 ──
  {
    code: 'ssc', name: '时时彩', category: 'LOTTERY' as const,
    status: 'ONLINE' as const, sortOrder: 4, drawIntervalSec: 600, minBet: 1, maxBet: 10000,
    rtp: 0.95,
    payTable: {
      big:   { multiplier: 1.98, desc: '总和 23-45' },
      small: { multiplier: 1.98, desc: '总和 0-22'  },
      odd:   { multiplier: 1.98, desc: '总和为奇数' },
      even:  { multiplier: 1.98, desc: '总和为偶数' },
      exact: { multiplier: 9.00, desc: '猜中个位数字' },
    },
  },
  {
    code: 'kuai3', name: '极速快三', category: 'LOTTERY' as const,
    status: 'ONLINE' as const, sortOrder: 5, drawIntervalSec: 60, minBet: 1, maxBet: 5000,
    rtp: 0.95,
    payTable: {
      big:     { multiplier: 1.98, desc: '总和 11-17（非豹子）' },
      small:   { multiplier: 1.98, desc: '总和 4-10（非豹子）'  },
      odd:     { multiplier: 1.98, desc: '总和奇数（非豹子）'   },
      even:    { multiplier: 1.98, desc: '总和偶数（非豹子）'   },
      triplet: { multiplier: 24.0, desc: '豹子（全同）'         },
      sum:     { multiplier: 6.50, desc: '猜总和（4-17）'       },
    },
  },
  {
    code: 'speed-racing', name: '极速赛车', category: 'LOTTERY' as const,
    status: 'ONLINE' as const, sortOrder: 6, drawIntervalSec: 60, minBet: 1, maxBet: 5000,
    rtp: 0.95,
    payTable: {
      champion: { multiplier: 9.00, desc: '猜冠军号码（1-10）' },
      runner:   { multiplier: 9.00, desc: '猜亚军号码（1-10）' },
      top2big:  { multiplier: 1.98, desc: '冠亚和大（12-19）'  },
      top2small:{ multiplier: 1.98, desc: '冠亚和小（3-11）'   },
      top2odd:  { multiplier: 1.98, desc: '冠亚和奇'           },
      top2even: { multiplier: 1.98, desc: '冠亚和偶'           },
    },
  },
  {
    code: 'bjsc', name: '北京赛车', category: 'LOTTERY' as const,
    status: 'ONLINE' as const, sortOrder: 7, drawIntervalSec: 300, minBet: 1, maxBet: 5000,
    rtp: 0.95,
    payTable: {
      champion: { multiplier: 9.00, desc: '猜冠军号码（1-10）' },
      runner:   { multiplier: 9.00, desc: '猜亚军号码（1-10）' },
      top2big:  { multiplier: 1.98, desc: '冠亚和大（12-19）'  },
      top2small:{ multiplier: 1.98, desc: '冠亚和小（3-11）'   },
      top2odd:  { multiplier: 1.98, desc: '冠亚和奇'           },
      top2even: { multiplier: 1.98, desc: '冠亚和偶'           },
    },
  },
];

async function main() {
  // ── 平台账户 ──
  await prisma.pointsAccount.upsert({
    where: { ownerId: 'PLATFORM' },
    update: {},
    create: { ownerType: 'PLATFORM', ownerId: 'PLATFORM', balance: 100_000_000 },
  });
  console.log('[seed] 平台账户 ✔');

  // ── 管理员账号 ──
  const ADMIN_USERNAME = 'admin';
  const ADMIN_PASSWORD = 'Admin@123456';
  const existing = await prisma.user.findUnique({ where: { username: ADMIN_USERNAME } });
  if (!existing) {
    const hash = await bcrypt.hash(ADMIN_PASSWORD, 12);
    const uid  = `UID${Date.now()}`;
    const admin = await prisma.user.create({
      data: {
        uid,
        username: ADMIN_USERNAME,
        nickname: '超级管理员',
        passwordHash: hash,
        role: 'ADMIN',
        status: 'ACTIVE',
        agentPath: '/',
        depth: 0,
      },
    });
    await prisma.pointsAccount.create({
      data: { ownerType: 'PLAYER', ownerId: admin.id, balance: 0 },
    });
    console.log(`[seed] 管理员账号: ${ADMIN_USERNAME} / ${ADMIN_PASSWORD}  ✔`);
  } else {
    // 确保 role 是 ADMIN
    if (existing.role !== 'ADMIN') {
      await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN' } });
    }
    console.log('[seed] 管理员账号已存在，跳过创建 ✔');
  }

  // ── 代理等级 ──
  for (let i = 0; i < AGENT_LEVELS.length; i++) {
    const lv = AGENT_LEVELS[i];
    await prisma.agentLevel.upsert({
      where: { code: lv.code },
      update: { ...lv, sortOrder: i },
      create: { ...lv, sortOrder: i },
    });
  }
  console.log('[seed] 代理等级 V1-V5 ✔');

  // ── 游戏目录 + 配置 ──
  for (const g of GAMES) {
    const { payTable, rtp, ...gameData } = g;
    const game = await prisma.game.upsert({
      where: { code: g.code },
      update: { status: g.status },
      create: gameData,
    });
    const existing = await prisma.gameConfig.findFirst({ where: { gameId: game.id, active: true } });
    if (!existing) {
      await prisma.gameConfig.create({
        data: { gameId: game.id, version: 1, active: true, rtp, payTable },
      });
    }
    console.log(`[seed] 游戏: ${g.name} ✔`);
  }

  console.log('\n[seed] 全部完成 🎉');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
