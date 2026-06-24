/** 正版数字图集 win-digits.png（538×62，Cocos dump spriteFrames） */
export const DIGIT_ATLAS_W = 538
export const DIGIT_ATLAS_H = 62

/** 各数字在图集中的 [x, width]（y=1, h≈60） */
export const DIGIT_ATLAS: Record<string, [number, number]> = {
  '0': [337, 48],
  '1': [437, 31],
  '2': [286, 49],
  '3': [50, 46],
  '4': [1, 47],
  '5': [146, 45],
  '6': [193, 45],
  '7': [387, 48],
  '8': [98, 46],
  '9': [240, 45],
}

/** 小数点（win-digits 图集内为 rotated 帧，需单独 PNG：win-digit-dot.png） */
export const DECIMAL_ATLAS = { x: 516, y: 32, w: 22, h: 19 } as const

/** 千分位逗号（number_display 图集 rotated 帧，单独 PNG：win-digit-comma.png） */
export const COMMA_ATLAS = { w: 68, h: 78 } as const

/** 数字 glyph 在 62px 行高内的可视高度（Cocos numberSprite ≈ 57） */
export const DIGIT_GLYPH_H = 57

/** total_win 结束页 number_display worldPct.height */
export const FS_END_DIGIT_H_PCT = 6.55

export type DigitStyleVariant = 'default' | 'fs-end'

export function digitSpriteStyle(
  digit: string,
  displayH: number,
  atlasUrl: string | null,
  dotUrl: string | null = null,
  commaUrl: string | null = null,
  variant: DigitStyleVariant = 'default',
): Record<string, string> {
  if (!atlasUrl && digit !== '.' && digit !== ',') return {}

  if (digit === ',') {
    const commaH =
      variant === 'fs-end'
        ? Math.max(4, Math.round(displayH * 0.52))
        : Math.max(4, Math.round(COMMA_ATLAS.h * (displayH / DIGIT_ATLAS_H)))
    const commaW = Math.max(4, Math.round((COMMA_ATLAS.w / COMMA_ATLAS.h) * commaH))
    if (commaUrl) {
      return {
        display: 'inline-block',
        width: `${commaW}px`,
        height: `${commaH}px`,
        backgroundImage: `url(${commaUrl})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% 100%',
        backgroundPosition: 'center',
        flexShrink: '0',
        alignSelf: 'flex-end',
        marginLeft: `${Math.round(-commaW * (variant === 'fs-end' ? 0.06 : 0.1))}px`,
        marginRight: `${Math.round(-commaW * (variant === 'fs-end' ? 0.06 : 0.1))}px`,
        ...(variant === 'fs-end'
          ? { marginBottom: `${Math.round(displayH * 0.04)}px` }
          : {}),
      }
    }
    return {}
  }

  if (digit === '.') {
    const scale = displayH / DIGIT_ATLAS_H
    const dotH =
      variant === 'fs-end'
        ? Math.max(4, Math.round(displayH * 0.21))
        : Math.max(4, Math.round(DECIMAL_ATLAS.h * scale))
    const dotW = Math.max(4, Math.round((DECIMAL_ATLAS.w / DECIMAL_ATLAS.h) * dotH))
    if (dotUrl) {
      return {
        display: 'inline-block',
        width: `${dotW}px`,
        height: `${dotH}px`,
        backgroundImage: `url(${dotUrl})`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: '100% 100%',
        backgroundPosition: 'center',
        flexShrink: '0',
        alignSelf: 'flex-end',
        marginBottom: `${Math.round(displayH * (variant === 'fs-end' ? 0.05 : 0.06))}px`,
      }
    }
    const { x, y } = DECIMAL_ATLAS
    if (!atlasUrl) return {}
    return {
      display: 'inline-block',
      width: `${dotW}px`,
      height: `${dotH}px`,
      backgroundImage: `url(${atlasUrl})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: `${Math.round(DIGIT_ATLAS_W * scale)}px ${displayH}px`,
      backgroundPosition: `-${Math.round(x * scale)}px -${Math.round(y * scale)}px`,
      flexShrink: '0',
      alignSelf: 'flex-end',
      marginBottom: `${Math.round(displayH * (variant === 'fs-end' ? 0.05 : 0.06))}px`,
    }
  }

  const pos = DIGIT_ATLAS[digit]
  if (!pos) return {}
  const [x, w] = pos
  const scale = displayH / DIGIT_ATLAS_H
  return {
    display: 'inline-block',
    width: `${Math.round(w * scale)}px`,
    height: `${displayH}px`,
    backgroundImage: `url(${atlasUrl})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: `${Math.round(DIGIT_ATLAS_W * scale)}px ${displayH}px`,
    backgroundPosition: `-${Math.round(x * scale)}px 0`,
    flexShrink: '0',
  }
}
