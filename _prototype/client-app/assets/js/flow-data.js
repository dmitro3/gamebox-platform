/**
 * 流水 mock 数据（共享）
 *   - flow 页面：展示明细
 *   - stats 页面：实时计算盈亏 / 胜率 / 趋势曲线
 *   - 真实接入后，flow / stats 都改读 server，删除本文件即可
 *
 * 字段说明：
 *   time     "YYYY-MM-DD HH:mm"
 *   kind     recharge / withdraw / bonus / commission / downline / rebate / game
 *   desc     用户可见中文描述
 *   amount   正数 = 入账（金色徽章 ⊕），负数 = 出账（红色徽章 ⊖）
 *   balance  当时账户余额
 *   game     仅 kind=game 时存在，游戏名（中文，与 game-lobby 里的卡片名一致）
 *   issue    期号
 *   bets[]   game 子注列表
 *   items[]  downline / rebate 的明细列表
 */
App.REBATE_RATE   = 0.008;     // 个人回水率 0.8%
App.DOWNLINE_RATE = 0.008;     // 下线流水抽佣 0.8%

App.FLOW_DATA = [
  // ===== 5-29 =====
  { time: '2026-05-29 15:42', kind: 'bonus',      desc: '每日签到奖励',       amount:  +18,    balance: 1658.96 },
  { time: '2026-05-29 14:32', kind: 'recharge',   desc: '上 分',              amount: +500,    balance: 1640.96 },

  { time: '2026-05-29 14:25', kind: 'game', game: '炸金花',  issue: 'A20260529-007', amount: +120,    balance: 1140.96, bets: [
    { bet: '豹 子',          stake:  50, amount: +100 },
    { bet: '同 花',          stake:  20, amount:  +20 }
  ]},
  { time: '2026-05-29 14:20', kind: 'game', game: '炸金花',  issue: 'A20260529-006', amount:  -80,    balance: 1020.96, bets: [
    { bet: '单 张',          stake:  50, amount:  -50 },
    { bet: '对 子',          stake:  30, amount:  -30 }
  ]},
  { time: '2026-05-29 13:15', kind: 'game', game: '斗 牛',   issue: 'B20260529-003', amount:  +60,    balance: 1100.96, bets: [
    { bet: '牛九 · 闲家',    stake:  50, amount:  +60 }
  ]},

  { time: '2026-05-29 11:30', kind: 'commission', desc: '推广佣金 · 5月29日', amount:  +88,    balance: 1040.96 },

  // —— 每天 06:00 自动发放：前一天的下线 / 回水佣金 ——
  { time: '2026-05-29 06:00', kind: 'downline', desc: '下线佣金 · 5月28日',  amount: +64.96,  balance:  952.96, items: [
    { user: '玩家***1234',   stake: 5200, rate: 0.008, amount: +41.60 },
    { user: '玩家***5678',   stake: 2480, rate: 0.008, amount: +19.84 },
    { user: '玩家***9012',   stake:  440, rate: 0.008, amount:  +3.52 }
  ]},
  { time: '2026-05-29 06:00', kind: 'rebate',   desc: '回水佣金 · 5月28日',  amount:  +1.84,  balance:  888.00, items: [
    { issue: 'C20260528-156', game: '北京赛车', stake: 30, rate: 0.008, amount: +0.24 },
    { issue: 'C20260528-156', game: '北京赛车', stake: 30, rate: 0.008, amount: +0.24 },
    { issue: 'C20260528-156', game: '北京赛车', stake: 40, rate: 0.008, amount: +0.32 },
    { issue: 'C20260528-155', game: '北京赛车', stake: 50, rate: 0.008, amount: +0.40 },
    { issue: 'D20260528-220', game: '时时彩',   stake: 20, rate: 0.008, amount: +0.16 },
    { issue: 'D20260528-220', game: '时时彩',   stake: 20, rate: 0.008, amount: +0.16 },
    { issue: 'D20260528-220', game: '时时彩',   stake: 20, rate: 0.008, amount: +0.16 },
    { issue: 'D20260528-220', game: '时时彩',   stake: 20, rate: 0.008, amount: +0.16 }
  ]},

  // ===== 5-28 =====
  { time: '2026-05-28 22:10', kind: 'withdraw',   desc: '下 分',              amount: -300,    balance:  886.16 },

  { time: '2026-05-28 21:45', kind: 'game', game: '北京赛车', issue: 'C20260528-156', amount: -100,    balance: 1186.16, bets: [
    { bet: '冠 军 · 大',     stake:  30, amount:  -30 },
    { bet: '亚 军 · 小',     stake:  30, amount:  -30 },
    { bet: '冠 亚 · 和值大', stake:  40, amount:  -40 }
  ]},
  { time: '2026-05-28 21:30', kind: 'game', game: '北京赛车', issue: 'C20260528-155', amount:  -50,    balance: 1286.16, bets: [
    { bet: '冠 军 · 单',     stake:  50, amount:  -50 }
  ]},
  { time: '2026-05-28 20:55', kind: 'game', game: '时时彩',   issue: 'D20260528-220', amount: +280,    balance: 1336.16, bets: [
    { bet: '百 位 · 5',      stake:  20, amount:  +80 },
    { bet: '十 位 · 7',      stake:  20, amount:  +80 },
    { bet: '个 位 · 3',      stake:  20, amount:  +80 },
    { bet: '组 三 · 5/6/7',  stake:  20, amount:  +40 }
  ]},

  { time: '2026-05-28 19:20', kind: 'recharge',   desc: '上 分',              amount:+1000,    balance: 1056.16 },
  { time: '2026-05-28 06:00', kind: 'downline', desc: '下线佣金 · 5月27日',  amount: +52.16,  balance:   56.16, items: [
    { user: '玩家***1234',   stake: 3800, rate: 0.008, amount: +30.40 },
    { user: '玩家***5678',   stake: 2200, rate: 0.008, amount: +17.60 },
    { user: '玩家***9012',   stake:  520, rate: 0.008, amount:  +4.16 }
  ]},
  { time: '2026-05-28 06:00', kind: 'rebate',   desc: '回水佣金 · 5月27日',  amount:  +2.00,  balance:    4.00, items: [
    { issue: 'A20260527-009', game: '炸金花',  stake: 150, rate: 0.008, amount: +1.20 },
    { issue: 'A20260527-008', game: '炸金花',  stake:  60, rate: 0.008, amount: +0.48 },
    { issue: 'A20260527-008', game: '炸金花',  stake:  40, rate: 0.008, amount: +0.32 }
  ]},

  // ===== 5-27 =====
  { time: '2026-05-27 23:50', kind: 'game', game: '炸金花',  issue: 'A20260527-009', amount: -150,    balance:    2.00, bets: [
    { bet: '顺 金',          stake: 150, amount: -150 }
  ]},
  { time: '2026-05-27 23:20', kind: 'game', game: '炸金花',  issue: 'A20260527-008', amount: -100,    balance:  152.00, bets: [
    { bet: '对 子',          stake:  60, amount:  -60 },
    { bet: '单 张',          stake:  40, amount:  -40 }
  ]},

  { time: '2026-05-27 22:10', kind: 'bonus',      desc: '首充奖励',           amount: +200,    balance:  252.00 }
];

/**
 * 扩充近 30 日"虚拟历史数据"：用 uid 作随机种子，生成稳定的每日总输赢
 *   - 仅在 stats 页面统计时使用（不进入 flow 明细）
 *   - 保证每次进入 stats 看到的 30 日曲线一致（同一 uid 同一日 → 同一数字）
 *   - 真实环境下 server 已有完整 30 日数据，无需这套
 */
App.getVirtualDailySummary = function (uid, daysBack) {
  // 简易确定性 hash 0..1
  function seedRand(seed) {
    let h = 2166136261 >>> 0;
    const s = String(seed);
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return (h % 100000) / 100000;
  }
  const arr = [];
  const today = new Date();
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateKey = d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
    // 近 3 天用真实 FLOW_DATA 统计，更早的日子用虚拟 hash 数据
    arr.push({ date: dateKey, virtual: i >= 3, seed: seedRand(uid + '_' + dateKey) });
  }
  return arr;
};
