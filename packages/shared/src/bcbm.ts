/**
 * 奔驰宝马（YoPlay YJBZ 风格）权威盘面与赔率。
 * 前后端必须同源引用，禁止各自改一份。
 *
 * 玩法：26 格跑灯 = 4 车标 × 红/绿/黄 × 2 份 + 2 格免费游戏；
 * 玩家押 12 个仓位（车标×颜色），可触发大三元 / 大四喜。
 */

export const BCBM_BRANDS = [
  { id: 'benz', label: '奔驰' },
  { id: 'bmw', label: '宝马' },
  { id: 'audi', label: '奥迪' },
  { id: 'vw', label: '大众' },
] as const;

export const BCBM_COLORS = [
  { id: 'red', label: '红' },
  { id: 'green', label: '绿' },
  { id: 'yellow', label: '黄' },
] as const;

export type BcbmBrandId = (typeof BCBM_BRANDS)[number]['id'];
export type BcbmColorId = (typeof BCBM_COLORS)[number]['id'];

/** 押注仓位 id：benz_red / bmw_green … */
export type BcbmBetId = `${BcbmBrandId}_${BcbmColorId}`;

export interface BcbmBetSlot {
  id: BcbmBetId;
  brand: BcbmBrandId;
  color: BcbmColorId;
  label: string;
  mult: number;
}

/** 与 YoPlay 官方一致的 12 仓赔率 */
export const BCBM_BET_SLOTS: readonly BcbmBetSlot[] = [
  { id: 'benz_red', brand: 'benz', color: 'red', label: '红奔驰', mult: 45 },
  { id: 'benz_green', brand: 'benz', color: 'green', label: '绿奔驰', mult: 38 },
  { id: 'benz_yellow', brand: 'benz', color: 'yellow', label: '黄奔驰', mult: 27 },
  { id: 'bmw_red', brand: 'bmw', color: 'red', label: '红宝马', mult: 22 },
  { id: 'bmw_green', brand: 'bmw', color: 'green', label: '绿宝马', mult: 16 },
  { id: 'bmw_yellow', brand: 'bmw', color: 'yellow', label: '黄宝马', mult: 13 },
  { id: 'audi_red', brand: 'audi', color: 'red', label: '红奥迪', mult: 12 },
  { id: 'audi_green', brand: 'audi', color: 'green', label: '绿奥迪', mult: 10 },
  { id: 'audi_yellow', brand: 'audi', color: 'yellow', label: '黄奥迪', mult: 6 },
  { id: 'vw_red', brand: 'vw', color: 'red', label: '红大众', mult: 7 },
  { id: 'vw_green', brand: 'vw', color: 'green', label: '绿大众', mult: 5 },
  { id: 'vw_yellow', brand: 'vw', color: 'yellow', label: '黄大众', mult: 4 },
] as const;

const SLOT_BY_ID = Object.fromEntries(BCBM_BET_SLOTS.map((s) => [s.id, s])) as Record<
  BcbmBetId,
  BcbmBetSlot
>;

export function isBcbmBetId(id: string): id is BcbmBetId {
  return id in SLOT_BY_ID;
}

export function bcbmBetSlot(id: BcbmBetId): BcbmBetSlot {
  return SLOT_BY_ID[id];
}

export type BcbmCellKind = BcbmBetId | 'free';

export interface BcbmRingCell {
  kind: BcbmCellKind;
  brand: BcbmBrandId | null;
  color: BcbmColorId | null;
  mult: number;
  /** 普通停点权重 */
  weight: number;
  label: string;
}

/** 26 格灯环（与 YoPlay 索引一致） */
export const BCBM_RING: readonly BcbmRingCell[] = (() => {
  const mk = (kind: BcbmCellKind, weight: number): BcbmRingCell => {
    if (kind === 'free') {
      return { kind, brand: null, color: null, mult: 0, weight, label: '免费游戏' };
    }
    const s = SLOT_BY_ID[kind];
    return {
      kind,
      brand: s.brand,
      color: s.color,
      mult: s.mult,
      weight,
      label: s.label,
    };
  };
  // 权重大致反比于倍率，免费略低
  return [
    mk('vw_red', 22),
    mk('vw_green', 26),
    mk('vw_yellow', 28),
    mk('free', 8),
    mk('benz_red', 4),
    mk('benz_green', 5),
    mk('benz_yellow', 6),
    mk('bmw_red', 8),
    mk('bmw_green', 10),
    mk('bmw_yellow', 12),
    mk('audi_red', 14),
    mk('audi_green', 16),
    mk('audi_yellow', 20),
    mk('vw_red', 22),
    mk('vw_green', 26),
    mk('vw_yellow', 28),
    mk('free', 8),
    mk('benz_red', 4),
    mk('benz_green', 5),
    mk('benz_yellow', 6),
    mk('bmw_red', 8),
    mk('bmw_green', 10),
    mk('bmw_yellow', 12),
    mk('audi_red', 14),
    mk('audi_green', 16),
    mk('audi_yellow', 20),
  ];
})();

/**
 * 对齐 YoPlay YBEN ResultBonus 0–5（locale Benz_hans.bonusName）：
 * 0 ALL_COLOR 大三元 / 1 ALL_CAR 大四喜 / 2 FURIOIUS 极速狂飙
 * 3 UTURN U型弯道 / 4 LIGHTNING 霹雳闪电 / 5 DRIFT 全民漂移
 * `free` 保留兼容旧配置，表现同 lightning。
 */
export const BCBM_AWARD_TYPES = [
  'normal',
  'free',
  'sanyuan_benz',
  'sanyuan_bmw',
  'sanyuan_audi',
  'sanyuan_vw',
  'sixi_red',
  'sixi_green',
  'sixi_yellow',
  'fast',
  'uturn',
  'lightning',
  'drift',
] as const;

export type BcbmAwardType = (typeof BCBM_AWARD_TYPES)[number];

export const BCBM_AWARD_LABELS: Record<BcbmAwardType, string> = {
  normal: '普通中奖',
  free: '霹雳闪电（兼容）',
  sanyuan_benz: '大三元·奔驰',
  sanyuan_bmw: '大三元·宝马',
  sanyuan_audi: '大三元·奥迪',
  sanyuan_vw: '大三元·大众',
  sixi_red: '大四喜·红',
  sixi_green: '大四喜·绿',
  sixi_yellow: '大四喜·黄',
  fast: '极速狂飙',
  uturn: 'U型弯道',
  lightning: '霹雳闪电',
  drift: '全民漂移',
};

export const BCBM_DEFAULT_AWARD_WEIGHTS: Record<BcbmAwardType, number> = {
  normal: 72,
  free: 0,
  sanyuan_benz: 2,
  sanyuan_bmw: 3,
  sanyuan_audi: 3,
  sanyuan_vw: 4,
  sixi_red: 1,
  sixi_green: 2,
  sixi_yellow: 2,
  fast: 3,
  uturn: 3,
  lightning: 3,
  drift: 2,
};

export function bcbmIndexesOfBet(id: BcbmBetId): number[] {
  return BCBM_RING.map((c, i) => (c.kind === id ? i : -1)).filter((i) => i >= 0);
}

export function bcbmIndexesOfBrand(brand: BcbmBrandId): number[] {
  return BCBM_RING.map((c, i) => (c.brand === brand ? i : -1)).filter((i) => i >= 0);
}

export function bcbmIndexesOfColor(color: BcbmColorId): number[] {
  return BCBM_RING.map((c, i) => (c.color === color ? i : -1)).filter((i) => i >= 0);
}

export function bcbmFreeIndexes(): number[] {
  return BCBM_RING.map((c, i) => (c.kind === 'free' ? i : -1)).filter((i) => i >= 0);
}

export function bcbmNonFreeIndexes(): number[] {
  return BCBM_RING.map((c, i) => (c.kind !== 'free' ? i : -1)).filter((i) => i >= 0);
}

/**
 * YoPlay SpinPanel 官方坐标（相对 858×538 跑道底板，单位 px）。
 * 来源：PC_YJBZ SpinPanelSkin.exml icon0..icon25
 */
export const BCBM_RING_SIZE = { w: 858, h: 538 } as const;

export const BCBM_RING_XY: ReadonlyArray<readonly [number, number]> = [
  [152.69, 26.68],
  [226.68, 11.0],
  [298.69, 10.0],
  [370.0, 0.0], // free（EXML 未写 y，默认 0）
  [467.02, 14.0],
  [537.02, 14.01],
  [615.35, 28.01],
  [684.68, 66.68],
  [728.68, 121.68],
  [754.35, 191.01],
  [750.69, 270.0],
  [726.02, 336.34],
  [680.68, 393.35],
  [615.35, 428.02],
  [539.35, 442.68],
  [469.68, 445.34],
  [370.0, 430.0], // free
  [294.7, 442.68],
  [224.01, 442.68],
  [148.7, 428.68],
  [87.69, 394.68],
  [40.02, 336.34],
  [12.92, 266.01],
  [12.21, 194.34],
  [40.58, 121.34],
  [87.35, 61.36],
];

/** @deprecated 使用 BCBM_RING_XY；保留别名避免旧引用报错 */
export const BCBM_SLOT_POS = BCBM_RING_XY;
