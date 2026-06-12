/**
 * 团队中心 mock 数据
 *   - 5 档代理等级配置 + 抽佣率
 *   - 我的状态：当前等级 + 团队累计流水 + 累计佣金
 *   - 团队成员：直属 5 人 + 二级 7 人
 *   - 佣金记录：8 条聚合记录（下线 / 回水 / 推广任务）
 *
 * 真实接入后，server 端按 uid 返回完整团队树即可，删除本文件
 */

// ===== 5 档代理等级 =====
App.TEAM_LEVELS = [
  { lv: 'V1', name: '青 铜 代 理', minStake:      0, rate: 0.005, accent: '#9c8158' },
  { lv: 'V2', name: '白 银 代 理', minStake:  10000, rate: 0.008, accent: '#c0c0c0' },
  { lv: 'V3', name: '黄 金 代 理', minStake:  50000, rate: 0.012, accent: '#d4af37' },
  { lv: 'V4', name: '铂 金 代 理', minStake: 200000, rate: 0.016, accent: '#9aa0e8' },
  { lv: 'V5', name: '钻 石 代 理', minStake: 500000, rate: 0.020, accent: '#88e8ff' }
];

App.TEAM_DATA = {
  // ===== 我的状态 =====
  me: {
    level: 'V2',
    teamStakeTotal:   28560,        // 团队累计有效流水（用于晋级）
    monthStakeTotal:  12480,
    todayStakeTotal:   3640,
    totalCommission:   568.16,
    monthCommission:   168.16,
    todayCommission:    66.80,
    promoCode: 'XX8632',
    promoUrl:  'https://gamebox.com/r/XX8632'
  },

  // ===== 团队成员（仅直属一级） =====
  members: [
    { uid: '688632001', name: '玩家***1234', joinedAt: '2026-05-15',
      stake7d: 5200, stakeTotal:  8450, contribCommission: 67.32, active: true,  lastActiveAt: '2026-05-29 14:25' },
    { uid: '688632002', name: '玩家***5678', joinedAt: '2026-05-10',
      stake7d: 2480, stakeTotal: 12480, contribCommission: 99.84, active: true,  lastActiveAt: '2026-05-29 11:40' },
    { uid: '688632003', name: '玩家***9012', joinedAt: '2026-05-03',
      stake7d:  440, stakeTotal:  1820, contribCommission: 14.56, active: true,  lastActiveAt: '2026-05-28 22:10' },
    { uid: '688632004', name: '玩家***3344', joinedAt: '2026-04-22',
      stake7d:    0, stakeTotal:   360, contribCommission:  2.88, active: false, lastActiveAt: '2026-05-15 09:20' },
    { uid: '688632005', name: '玩家***5566', joinedAt: '2026-04-15',
      stake7d:    0, stakeTotal:     0, contribCommission:  0.00, active: false, lastActiveAt: '2026-04-15 18:00' }
  ],

  // ===== 佣金聚合记录 =====
  commissionLogs: [
    { time: '2026-05-29 11:30', kind: 'promote',  amount: +88.00, source: '推 广 任 务 奖 励',     detail: '邀 请 新 用 户 1 名 完 成 首 充' },
    { time: '2026-05-29 06:00', kind: 'downline', amount: +64.96, source: '5 月 28 日 下 线 流 水', detail: '直 属 3 人 · 累 计 流 水 8,120' },
    { time: '2026-05-29 06:00', kind: 'rebate',   amount: +1.84,  source: '5 月 28 日 个 人 回 水', detail: '8 笔 有 效 注 单' },
    { time: '2026-05-28 06:00', kind: 'downline', amount: +52.16, source: '5 月 27 日 下 线 流 水', detail: '直 属 3 人 · 累 计 流 水 6,520' },
    { time: '2026-05-28 06:00', kind: 'rebate',   amount: +2.00,  source: '5 月 27 日 个 人 回 水', detail: '3 笔 有 效 注 单' },
    { time: '2026-05-27 06:00', kind: 'downline', amount: +18.40, source: '5 月 26 日 下 线 流 水', detail: '直 属 2 人 · 累 计 流 水 2,300' },
    { time: '2026-05-26 11:00', kind: 'promote',  amount: +50.00, source: '推 广 任 务 奖 励',     detail: '邀 请 新 用 户 1 名 完 成 注 册' },
    { time: '2026-05-25 06:00', kind: 'downline', amount: +28.00, source: '5 月 24 日 下 线 流 水', detail: '直 属 2 人 · 累 计 流 水 3,500' }
  ]
};

// ===== 工具：根据团队累计流水，算出当前等级 + 下一级 + 进度 =====
App.getTeamLevelInfo = function (teamStakeTotal) {
  const levels = App.TEAM_LEVELS;
  let curIdx = 0;
  for (let i = 0; i < levels.length; i++) {
    if (teamStakeTotal >= levels[i].minStake) curIdx = i;
  }
  const cur  = levels[curIdx];
  const next = levels[curIdx + 1] || null;
  let progress = 1, remain = 0;
  if (next) {
    const span = next.minStake - cur.minStake;
    progress = Math.max(0, Math.min(1, (teamStakeTotal - cur.minStake) / span));
    remain = Math.max(0, next.minStake - teamStakeTotal);
  }
  return { cur: cur, next: next, progress: progress, remain: remain };
};
