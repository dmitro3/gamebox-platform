/**
 * 麻将胡了1 音效配置
 *
 * 路径 / BGM / clip 时长：PG export JSON（pgMahjongAudioFromJson.ts）
 * general-audio / vox 切片：v4 捕获（scripts/_pg_capture.json）+ vox silencedetect 分段
 */
import type { PaySymbolId } from '@/games/mahjong/mahjongWays1'
import { PG_MAHJONG_AUDIO_PUBLIC } from './pgMahjongAudioFromJson'

export type AudioSpriteCue = { start: number; end: number }

/**
 * v4 捕获要点：
 * - 旋转：g:69 + v:3 → g:86 → g:60 → g:81(loop) → g:84×5
 * - 中奖报牌：v:24~41 独立播放（无 general 前置）
 * - 中奖音效：g:65/67/87；倍数：g:79 + v:11/9/14（主局）或 v:10/12/17/18（免费）
 */
const MAHJONG_SPRITE_CUES = {
  spinClick: { start: 69, end: 70.475 },
  spinVox: { start: 3, end: 3.625 },
  spinPreRoll: { start: 60, end: 61.146 },
  spinRollLoop: { start: 81, end: 82.489 },
  tileClack: { start: 86, end: 86.037 },
  reelStop: [
    { start: 84, end: 84.19 },
    { start: 84, end: 84.19 },
    { start: 84, end: 84.19 },
    { start: 84, end: 84.19 },
    { start: 84, end: 84.19 },
  ] as AudioSpriteCue[],
  winCascade: [
    { start: 65, end: 66.007 },
    { start: 67, end: 68.119 },
    { start: 87, end: 88.768 },
    { start: 87, end: 88.768 },
  ] as AudioSpriteCue[],
  multiplierUp: [
    { start: 79, end: 80.703 },
    { start: 79, end: 80.703 },
    { start: 79, end: 80.703 },
    { start: 79, end: 80.703 },
  ] as AudioSpriteCue[],
  scatterFirst: { start: 77, end: 78.919 },
  scatterRetrigger: { start: 89, end: 89.829 },
  freeSpinEnter: { start: 71, end: 72.427 },
  freeSpinEnd: { start: 73, end: 74.707 },
  /** 主局倍数语音 — 与 g:79 配对，连升 2x→3x→5x */
  voxMultiplierNormal: [
    null,
    { start: 11, end: 11.784 },
    { start: 9, end: 9.836 },
    { start: 14, end: 14.94 },
  ] as (AudioSpriteCue | null)[],
  /** 免费局倍数语音 — 2x/4x/6x/10x */
  voxMultiplierFree: [
    { start: 10, end: 10.836 },
    { start: 12, end: 13.402 },
    { start: 17, end: 17.575 },
    { start: 18, end: 19.149 },
  ] as AudioSpriteCue[],
  voxScatterFirst: { start: 15, end: 16.097 },
  voxFreeSpinEnter: { start: 4, end: 4.546 },
  voxFreeSpinEnd: { start: 8, end: 8.625 },
  /**
   * 中奖报牌 — vox 20~43s 区，按赔付从低到高排列（捕获独立播放 v:24/27/30/32/34/37/39/41）
   */
  voxTileAnnounce: {
    '2s': { start: 24, end: 26.585 },
    '2t': { start: 27, end: 29.988 },
    '5s': { start: 30, end: 31.98 },
    '5t': { start: 32, end: 33.711 },
    '8w': { start: 34, end: 36.769 },
    bai: { start: 37, end: 38.59 },
    zhong: { start: 39, end: 40.52 },
    fa: { start: 41, end: 42.773 },
  } as Record<PaySymbolId, AudioSpriteCue>,
} as const

export const MAHJONG_AUDIO_SPRITES = {
  general: PG_MAHJONG_AUDIO_PUBLIC.general,
  vox: PG_MAHJONG_AUDIO_PUBLIC.vox,
  ...MAHJONG_SPRITE_CUES,
} as const
