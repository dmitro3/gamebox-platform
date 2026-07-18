/**
 * PG 通用一次性音效对象池（无游戏前缀、不依赖任何 games/<游戏名> 模块）。
 *
 * 目的：高频一次性 SFX 若每次 `new Audio()` 会不断产生游离音频实例，
 * 在连续下注/跑灯时造成 GC 抖动与内存增长。此处按 url 维护一个小对象池，
 * 复用处于空闲（ended/paused）的实例，仅在池满且全忙时才新建。
 *
 * 行为与 `new Audio(url); play()` 一致：可重叠播放、音量可调；不改变任何音色/时序。
 */

interface PoolEntry {
  instances: HTMLAudioElement[]
}

const POOL_MAX_PER_URL = 6
const pool = new Map<string, PoolEntry>()

function createInstance(url: string): HTMLAudioElement {
  const a = new Audio(url)
  a.preload = 'auto'
  return a
}

/** 取一个可用于播放的一次性实例（优先复用空闲实例）。 */
export function acquireOneShot(url: string): HTMLAudioElement {
  let entry = pool.get(url)
  if (!entry) {
    entry = { instances: [] }
    pool.set(url, entry)
  }
  // 复用已播完/暂停的实例
  for (const inst of entry.instances) {
    if (inst.ended || inst.paused) return inst
  }
  if (entry.instances.length < POOL_MAX_PER_URL) {
    const inst = createInstance(url)
    entry.instances.push(inst)
    return inst
  }
  // 池满且全忙：复用最早的一个（打断，符合高频短音效预期）
  return entry.instances[0]
}

/** 播放一次性音效（池化）。 */
export function playOneShot(url: string, volume = 0.75): HTMLAudioElement {
  const a = acquireOneShot(url)
  try {
    a.currentTime = 0
  } catch {
    /* 某些浏览器未加载完设置 currentTime 会抛错，忽略 */
  }
  a.volume = Math.min(1, Math.max(0, volume))
  void a.play().catch(() => {})
  return a
}

/** 预热：提前建实例并触发浏览器缓冲。 */
export function warmOneShot(url: string): void {
  const inst = acquireOneShot(url)
  inst.load()
}

/** 清空某 url 的池（可选，用于离场释放）。 */
export function clearPool(url?: string): void {
  if (url) {
    const entry = pool.get(url)
    entry?.instances.forEach((i) => {
      i.pause()
      i.src = ''
    })
    pool.delete(url)
    return
  }
  for (const entry of pool.values()) {
    entry.instances.forEach((i) => {
      i.pause()
      i.src = ''
    })
  }
  pool.clear()
}
