/**
 * 初始化种子数据。运行：pnpm --filter @gamebox/server prisma:seed
 * 内容：
 *   - 平台积分账户(PLATFORM)
 *   - 平台管理员账号(ADMIN)  密码：Admin@123456
 *   - 代理等级 V1-V5
 *   - 游戏目录 + 各自 active 的 GameConfig（爆率/赔率）
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
    code: 'ffc', name: '1分时时彩', category: 'LOTTERY' as const,
    status: 'ONLINE' as const, sortOrder: 2, drawIntervalSec: 60, minBet: 1, maxBet: 10000,
    rtp: 0.95,
    payTable: {
      big:   { multiplier: 1.995, desc: '总和 23-45' },
      small: { multiplier: 1.995, desc: '总和 0-22'  },
      odd:   { multiplier: 1.995, desc: '总和为奇数' },
      even:  { multiplier: 1.995, desc: '总和为偶数' },
      exact: { multiplier: 9.95, desc: '猜中个位数字' },
    },
  },
  {
    code: 'slots-mahjong', name: '麻将胡了', category: 'SLOT' as const,
    status: 'ONLINE' as const, sortOrder: 5, minBet: 1, maxBet: 10000,
    rtp: 0.96,
    payTable: {
      symbolWeights: {
        '2t': 16, '2s': 16, '5t': 12, '5s': 12,
        '8w': 9, bai: 7, zhong: 6, fa: 5, wild: 2, hu: 2.5,
      },
      goldenChance: 0.14,
    },
  },
  // ── 街机类游戏 ──
  {
    code: 'fruit-machine', name: '水果机', category: 'ARCADE' as const,
    status: 'ONLINE' as const, sortOrder: 3, minBet: 1, maxBet: 50_000,
    rtp: 0.96,
    // 盘面/赔率在 @gamebox/shared fruit-machine；此处只配大奖权重
    payTable: {
      awardWeights: {
        normal: 62,
        luck_send: 8,
        luck_eat: 4,
        train: 10,
        big3: 5,
        small3: 5,
        four: 4,
        slam: 2,
      },
    },
  },
  {
    code: 'bcbm', name: '奔驰宝马', category: 'ARCADE' as const,
    status: 'ONLINE' as const, sortOrder: 8, minBet: 1, maxBet: 50_000,
    rtp: 0.95,
    // 盘面/赔率在 @gamebox/shared bcbm；此处只配大奖权重
    payTable: {
      awardWeights: {
        normal: 78,
        free: 6,
        sanyuan_benz: 2,
        sanyuan_bmw: 3,
        sanyuan_audi: 3,
        sanyuan_vw: 4,
        sixi_red: 1,
        sixi_green: 2,
        sixi_yellow: 2,
      },
    },
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
    code: 'ssc', name: '快乐时时彩', category: 'LOTTERY' as const,
    status: 'ONLINE' as const, sortOrder: 4, drawIntervalSec: 90, minBet: 1, maxBet: 10000,
    rtp: 0.95,
    payTable: {
      big:   { multiplier: 1.995, desc: '总和 23-45' },
      small: { multiplier: 1.995, desc: '总和 0-22'  },
      odd:   { multiplier: 1.995, desc: '总和为奇数' },
      even:  { multiplier: 1.995, desc: '总和为偶数' },
      exact: { multiplier: 9.95, desc: '猜中个位数字' },
    },
  },
  {
    code: 'kuai3', name: '1分快三', category: 'LOTTERY' as const,
    status: 'ONLINE' as const, sortOrder: 5, drawIntervalSec: 55, minBet: 1, maxBet: 5000,
    rtp: 0.95,
    payTable: {
      big:     { multiplier: 1.98, desc: '总和 11-17（非豹子）' },
      small:   { multiplier: 1.98, desc: '总和 4-10（非豹子）'  },
      odd:     { multiplier: 1.98, desc: '总和奇数（非豹子）'   },
      even:    { multiplier: 1.98, desc: '总和偶数（非豹子）'   },
      triplet: { multiplier: 24.0, desc: '豹子（全同）'         },
      sum:     { multiplier: 6.50, desc: '和值兜底（H5 按点数分档）' },
      dice:    { multiplier: 2.0, desc: '三军出现1次；2次×3、3次×4' },
    },
  },
  {
    code: 'speed-racing', name: '极速赛车', category: 'LOTTERY' as const,
    status: 'ONLINE' as const, sortOrder: 6, drawIntervalSec: 55, minBet: 1, maxBet: 5000,
    rtp: 0.95,
    payTable: {
      champion: { multiplier: 9.8, desc: '猜赛道1/冠军号码（1-10）' },
      runner:   { multiplier: 9.8, desc: '猜赛道2/亚军号码（1-10）' },
      top2big:  { multiplier: 1.98, desc: '冠亚和大（12-19）'  },
      top2small:{ multiplier: 1.98, desc: '冠亚和小（3-11）'   },
      top2odd:  { multiplier: 1.98, desc: '冠亚和奇'           },
      top2even: { multiplier: 1.98, desc: '冠亚和偶'           },
    },
  },
  {
    code: 'speed-boat', name: '幸运飞艇', category: 'LOTTERY' as const,
    status: 'ONLINE' as const, sortOrder: 8, drawIntervalSec: 60, minBet: 1, maxBet: 5000,
    rtp: 0.95,
    payTable: {
      champion: { multiplier: 9.8, desc: '猜赛道1/冠军号码（1-10）' },
      runner:   { multiplier: 9.8, desc: '猜赛道2/亚军号码（1-10）' },
      top2big:  { multiplier: 1.98, desc: '冠亚和大（12-19）'  },
      top2small:{ multiplier: 1.98, desc: '冠亚和小（3-11）'   },
      top2odd:  { multiplier: 1.98, desc: '冠亚和奇'           },
      top2even: { multiplier: 1.98, desc: '冠亚和偶'           },
    },
  },
  {
    code: 'bjsc', name: '北京赛车', category: 'LOTTERY' as const,
    status: 'ONLINE' as const, sortOrder: 7, drawIntervalSec: 60, minBet: 1, maxBet: 5000,
    rtp: 0.95,
    payTable: {
      champion: { multiplier: 9.8, desc: '猜赛道1/冠军号码（1-10）' },
      runner:   { multiplier: 9.8, desc: '猜赛道2/亚军号码（1-10）' },
      top2big:  { multiplier: 1.98, desc: '冠亚和大（12-19）'  },
      top2small:{ multiplier: 1.98, desc: '冠亚和小（3-11）'   },
      top2odd:  { multiplier: 1.98, desc: '冠亚和奇'           },
      top2even: { multiplier: 1.98, desc: '冠亚和偶'           },
    },
  },
  {
    code: 'lhc', name: '幸运六合彩', category: 'LOTTERY' as const,
    status: 'ONLINE' as const, sortOrder: 9, drawIntervalSec: 60, minBet: 1, maxBet: 10000,
    rtp: 0.95,
    payTable: {
      big:     { multiplier: 1.98, desc: '特码大（25-49）' },
      small:   { multiplier: 1.98, desc: '特码小（1-24）' },
      odd:     { multiplier: 1.98, desc: '特码单' },
      even:    { multiplier: 1.98, desc: '特码双' },
      special: { multiplier: 47.0, desc: '特码号码' },
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
      update: {
        status: g.status,
        name: g.name,
        sortOrder: g.sortOrder,
        ...(typeof g.drawIntervalSec === 'number' ? { drawIntervalSec: g.drawIntervalSec } : {}),
      },
      create: gameData,
    });
    const existing = await prisma.gameConfig.findFirst({ where: { gameId: game.id, active: true } });
    if (!existing) {
      await prisma.gameConfig.create({
        data: { gameId: game.id, version: 1, active: true, rtp, payTable },
      });
    } else if (
      g.code === 'bcbm' ||
      g.category === 'LOTTERY'
    ) {
      // 对齐 H5/大厅赔率与周期配置
      await prisma.gameConfig.update({
        where: { id: existing.id },
        data: { rtp, payTable },
      });
    }
    console.log(`[seed] 游戏: ${g.name} ✔`);
  }

  // ── 活动配置 ──
  const ACTIVITIES = [
    {
      code: 'newbie_gift',
      type: 'NEWBIE' as const,
      title: '新人注册礼 · 领 100 分',
      status: 'ONLINE',
      config: { reward: 100, expiresHours: 72 },
    },
    {
      code: 'first_deposit',
      type: 'FIRST_DEPOSIT' as const,
      title: '首充豪礼',
      status: 'ONLINE',
      config: {
        tiers: [
          { minDeposit: 100,    reward: 20   },
          { minDeposit: 500,    reward: 80   },
          { minDeposit: 1000,   reward: 200  },
          { minDeposit: 5000,   reward: 800  },
          { minDeposit: 10000,  reward: 2000 },
        ],
      },
    },
    {
      code: 'vip_gift',
      type: 'VIP' as const,
      title: 'VIP 充值礼包',
      status: 'ONLINE',
      config: {
        tiers: [
          { minDeposit: 1000,   reward: 100  },
          { minDeposit: 5000,   reward: 500  },
          { minDeposit: 20000,  reward: 2000 },
          { minDeposit: 100000, reward: 10000 },
        ],
      },
    },
  ];

  for (const act of ACTIVITIES) {
    await prisma.activity.upsert({
      where: { code: act.code },
      update: { status: act.status, config: act.config },
      create: act,
    });
    console.log(`[seed] 活动: ${act.title} ✔`);
  }

  console.log('\n[seed] 全部完成 🎉');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
