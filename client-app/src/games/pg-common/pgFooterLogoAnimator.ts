/** 正版 PG logo 彩虹色序列 */
export const PG_GRADIENT_PALETTES = [
  ['#d888f3', '#fee8a1', '#a0f5b2', '#30f4e1', '#42b1ff', '#78fbf0', '#a3bdfa', '#d888f3'],
  ['#8aadff', '#78fbf0', '#42b1ff', '#8aadff', '#a0f5b2', '#fee8a1', '#d888f3', '#8aadff'],
  ['#30f4e1', '#d888f3', '#42b1ff', '#8aadff', '#a0f5b2', '#78fbf0', '#30f4e1', '#30f4e1'],
] as const

const LETTER_GROUP_IDS = ['PG1', 'PG2', 'PG3', 'PG4', 'PG5'] as const

function getLetterPaths(root: HTMLElement) {
  const paths: SVGPathElement[] = []
  LETTER_GROUP_IDS.forEach((id) => {
    const group = root.querySelector(`#${id}`)
    if (!group) return
    group.querySelectorAll('path').forEach((node) => {
      if (node instanceof SVGPathElement) paths.push(node)
    })
  })
  const titlePath = root.querySelector('#PG-Title path')
  if (titlePath instanceof SVGPathElement) paths.push(titlePath)
  return paths
}

function lerpColor(a: string, b: string, ratio: number) {
  const parse = (hex: string) => {
    const normalized = hex.replace('#', '')
    return [
      parseInt(normalized.slice(0, 2), 16),
      parseInt(normalized.slice(2, 4), 16),
      parseInt(normalized.slice(4, 6), 16),
    ]
  }
  const [ar, ag, ab] = parse(a)
  const [br, bg, bb] = parse(b)
  const mix = (from: number, to: number) => Math.round(from + (to - from) * ratio)
  const r = mix(ar, br)
  const g = mix(ag, bg)
  const bch = mix(ab, bb)
  return `#${[r, g, bch].map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

function samplePalette(palette: readonly string[], progress: number) {
  const last = palette.length - 1
  const pos = progress * last
  const index = Math.floor(pos)
  const next = Math.min(index + 1, last)
  const ratio = pos - index
  return lerpColor(palette[index], palette[next], ratio)
}

export function mountPgLogoColorCycle(root: HTMLElement) {
  const svg = root.querySelector('#pg-footer-svg')
  const stops = [
    root.querySelector('#pg-grad-stop-0'),
    root.querySelector('#pg-grad-stop-1'),
    root.querySelector('#pg-grad-stop-2'),
  ]
  const letterPaths = getLetterPaths(root)

  if (!(svg instanceof SVGSVGElement) || stops.some((stop) => !(stop instanceof SVGStopElement))) {
    return () => {}
  }

  const timers: number[] = []
  let intervalId: number | null = null
  let rafId: number | null = null
  let gradientMode = false
  let animStart = performance.now()

  const tickGradient = (now: number) => {
    if (!gradientMode) return
    const elapsed = (now - animStart) % 6000
    const progress = elapsed / 6000
    stops.forEach((stop, index) => {
      if (!(stop instanceof SVGStopElement)) return
      stop.setAttribute('stop-color', samplePalette(PG_GRADIENT_PALETTES[index], progress))
    })
    rafId = window.requestAnimationFrame(tickGradient)
  }

  const setGradientFill = (enabled: boolean) => {
    gradientMode = enabled
    const fill = enabled ? 'url(#pg-footer-grad)' : '#ffffff'
    letterPaths.forEach((path) => path.setAttribute('fill', fill))
    if (enabled) {
      animStart = performance.now()
      if (rafId !== null) window.cancelAnimationFrame(rafId)
      rafId = window.requestAnimationFrame(tickGradient)
    } else if (rafId !== null) {
      window.cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  const schedule = (fn: () => void, ms: number) => {
    timers.push(window.setTimeout(fn, ms))
  }

  schedule(() => {
    setGradientFill(true)
    schedule(() => setGradientFill(false), 5500)
    intervalId = window.setInterval(() => {
      setGradientFill(true)
      schedule(() => setGradientFill(false), 8000)
    }, 12000)
  }, 3500)

  return () => {
    timers.forEach((id) => window.clearTimeout(id))
    if (intervalId !== null) window.clearInterval(intervalId)
    if (rafId !== null) window.cancelAnimationFrame(rafId)
    setGradientFill(false)
  }
}
