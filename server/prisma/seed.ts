/**
 * 初始化种子数据。运行：pnpm --filter @gamebox/server prisma:seed
 * 内容：
 *   - 平台积分账户(PLATFORM)
 *   - 平台管理员账号(ADMIN)
 *   - 代理等级 V1-V5（对应原型 team-data）
 *   - 游戏目录 + 各自 active 的 GameConfig（爆率/赔率）
 *   - 基础活动
 *
 * 注意：上线前请勿在生产执行含测试账号的 seed。
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const AGENT_LEVELS = [
  { code: 'V1', name: '青铜代理', minTeamFlow: 0, commissionRate: 0.005, accent: '#9c8158' },
  { code: 'V2', name: '白银代理', minTeamFlow: 10000, commissionRate: 0.008, accent: '#c0c0c0' },
  { code: 'V3', name: '黄金代理', minTeamFlow: 50000, commissionRate: 0.012, accent: '#d4af37' },
  { code: 'V4', name: '铂金代理', minTeamFlow: 200000, commissionRate: 0.016, accent: '#9aa0e8' },
  { code: 'V5', name: '钻石代理', minTeamFlow: 500000, commissionRate: 0.02, accent: '#88e8ff' },
];

async function main() {
  // 平台账户
  await prisma.pointsAccount.upsert({
    where: { ownerId: 'PLATFORM' },
    update: {},
    create: { ownerType: 'PLATFORM', ownerId: 'PLATFORM', balance: 0 },
  });

  // 代理等级
  for (let i = 0; i < AGENT_LEVELS.length; i++) {
    const lv = AGENT_LEVELS[i];
    await prisma.agentLevel.upsert({
      where: { code: lv.code },
      update: { ...lv, sortOrder: i },
      create: { ...lv, sortOrder: i },
    });
  }

  // TODO: 管理员账号、游戏目录 + GameConfig、基础活动
  // eslint-disable-next-line no-console
  console.log('[seed] 平台账户 + 代理等级 已就绪');
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
