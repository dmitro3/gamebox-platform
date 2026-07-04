/** 正版 #splash.screen_compat 设计稿尺寸 */

export const PG_SCREEN_W = 360
export const PG_SCREEN_H = 640

/** 与正版 game-overlay 类似：按视口等比缩放 360×640 */
export function calcPgScreenScale(): number {
  const scaleH = window.innerHeight / PG_SCREEN_H
  const scaleW = window.innerWidth / PG_SCREEN_W
  return Math.min(scaleH, scaleW)
}
