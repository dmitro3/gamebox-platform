import manifest from '../../../public/images/games/captain/pg/manifest.json'

const BASE = '/images/games/captain'

function resolvePath(rel: string): string {
  if (rel.startsWith('../')) {
    return `/images/games/${rel.slice(3)}`
  }
  return `${BASE}/${rel}`
}

export function pgUi(key: string): string | null {
  const rel = (manifest.ui as Record<string, string | undefined>)[key]
  return rel ? resolvePath(rel) : null
}

export function hasPgUi(key: string): boolean {
  return Boolean((manifest.ui as Record<string, string | undefined>)[key])
}

export function pgSymbol(key: string): string | null {
  const rel = (manifest.symbols as Record<string, string | undefined>)[key]
  return rel ? resolvePath(rel) : null
}

export const pgManifest = manifest
