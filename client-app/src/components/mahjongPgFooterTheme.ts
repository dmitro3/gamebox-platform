import { computed, toValue, type MaybeRefOrGetter } from 'vue'

/** 正版麻将胡了 theme_color：RGB(180,120,80) */
export const MAHJONG_PG_THEME_COLOR = '#B47850'

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return null
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  }
}

export function usePgFooterTheme(themeColorSource: MaybeRefOrGetter<string>) {
  const maskColorStyle = computed(() => {
    const color = toValue(themeColorSource)
    const rgb = hexToRgb(color)
    if (!rgb) {
      return {
        backgroundImage: `linear-gradient(180deg, rgba(180, 120, 80, 0), ${color})`,
      }
    }
    return {
      backgroundImage: `linear-gradient(180deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0), ${color})`,
    }
  })

  return { maskColorStyle }
}
