/**
 * PG 通用图片预加载器（无游戏前缀、不依赖任何 games/<游戏名> 模块）。
 *
 * 用途：封面等待期把游戏进场必需的图预先拉进浏览器缓存，
 * 并把「真实加载进度」回调出去驱动进度条（替代写死时长的假进度）。
 * 视觉不变，只是进度变真、进场后首帧不再等图。
 */

export interface PreloadOptions {
  /** 每张图加载完成（无论成功失败）回调，用于驱动进度 0~1 */
  onProgress?: (loaded: number, total: number) => void
  /** 兜底最短展示时长（ms），避免图秒回导致进度条一闪而过 */
  minDurationMs?: number
  /** 整体超时（ms），网络异常时不至于卡死封面 */
  timeoutMs?: number
}

function loadOne(url: string): Promise<void> {
  return new Promise((resolve) => {
    const img = new Image()
    const done = () => resolve()
    img.onload = done
    img.onerror = done
    img.src = url
    // 已缓存的图可能同步 complete
    if (img.complete) done()
  })
}

/**
 * 预加载一组图片。返回 Promise，在全部完成或超时后 resolve。
 */
export async function preloadImages(urls: string[], opts: PreloadOptions = {}): Promise<void> {
  const list = [...new Set(urls.filter(Boolean))]
  const total = list.length
  const startAt = Date.now()
  const minMs = opts.minDurationMs ?? 0

  if (total === 0) {
    opts.onProgress?.(1, 1)
    if (minMs > 0) await sleep(minMs)
    return
  }

  let loaded = 0
  const step = () => {
    loaded += 1
    opts.onProgress?.(loaded, total)
  }

  const all = Promise.all(
    list.map((u) => loadOne(u).then(step)),
  ).then(() => undefined)

  const guarded = opts.timeoutMs
    ? Promise.race([all, sleep(opts.timeoutMs)])
    : all
  await guarded

  const remain = minMs - (Date.now() - startAt)
  if (remain > 0) await sleep(remain)
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
