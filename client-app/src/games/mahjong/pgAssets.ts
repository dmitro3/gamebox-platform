import manifest from '../../../public/images/games/mahjong/pg/manifest.json'



const BASE = '/images/games/mahjong'



function resolvePath(rel: string): string {

  if (rel.startsWith('../')) {

    return `/images/games/${rel.slice(3)}`

  }

  return `${BASE}/${rel}`

}



/** PG 资源中存在的 UI 图；不存在则返回 null（不渲染） */

export function pgUi(key: string): string | null {

  const rel = (manifest.ui as Record<string, string | undefined>)[key]

  return rel ? resolvePath(rel) : null

}



export function hasPgUi(key: string): boolean {

  return Boolean((manifest.ui as Record<string, string | undefined>)[key])

}



/** 免费局优先用 `-free` 变体，否则回退普通 key */

export function pgUiMode(key: string, isFreeSpin: boolean): string | null {

  if (isFreeSpin) {

    const freeKey = `${key}-free`

    if (hasPgUi(freeKey)) return pgUi(freeKey)

  }

  return pgUi(key)

}



export type BigWinTier = 'big' | 'mega' | 'super'



const BIG_WIN_KEYS: Record<BigWinTier, string> = {

  big: 'big-win-bw',

  mega: 'big-win-mw',

  super: 'big-win-smw',

}



export function pgBigWinImage(tier: BigWinTier): string | null {

  return pgUi(BIG_WIN_KEYS[tier])

}



export const pgManifest = manifest

