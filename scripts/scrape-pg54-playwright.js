/**
 * 自动打开 PG 赏金船长 (game 54) 试玩页，抓取 Network 资源到 scripts/赏金船长/
 *
 * 用法: node scrape-pg54-playwright.js
 */
const fs = require('fs')
const path = require('path')
const { chromium } = require('playwright')

const GAME_URL =
  'https://www.pgf-nvgais.com/54/index.html?' +
  'btt=1&oc=0&iwk=1&ops=cd80d3917ab04319939d5502c46f7a85&l=zh&' +
  'or=https://www.pgf-nvgais.com&ot=3159a489-7df7-4704-942f-288c03095ff5&' +
  'card=1&game_code=54&al=vpxb5588415'

const OUT = path.join(__dirname, '赏金船长')
const HOST_RE = /pgf-nvgais\.com/i
const ASSET_RE = /\.(png|jpg|jpeg|webp|mp3|ogg|wav|json|js)$/i
const PATH_RE = /\/54\/|\/shared\//

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function categorize(url) {
  if (/\/assets\/resources\/native\//i.test(url)) return 'native'
  if (/\/assets\/resources\/import\//i.test(url)) return 'import'
  if (/config\..+\.json$/i.test(url)) return 'config'
  if (/\.(png|jpg|jpeg|webp)$/i.test(url)) return 'images'
  if (/\.(mp3|ogg|wav)$/i.test(url)) return 'audio'
  if (/\.json$/i.test(url)) return 'json'
  if (/\.js$/i.test(url)) return 'js'
  return 'other'
}

function fileNameFromUrl(url) {
  const parts = new URL(url).pathname.split('/').filter(Boolean)
  return parts.length >= 2 ? parts.slice(-2).join('_') : parts.pop() || 'asset'
}

function flatName(url) {
  const cat = categorize(url)
  return `${cat}__${fileNameFromUrl(url)}`
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true })
  const seen = new Map()

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
    viewport: { width: 390, height: 844 },
  })
  const page = await context.newPage()

  page.on('response', async (response) => {
    const url = response.url()
    if (!HOST_RE.test(url) || !PATH_RE.test(url) || !ASSET_RE.test(url)) return
    if (seen.has(url)) return
    if (response.status() < 200 || response.status() >= 400) return
    try {
      const body = await response.body()
      if (!body || body.length === 0) return
      const name = flatName(url)
      fs.writeFileSync(path.join(OUT, name), body)
      seen.set(url, { name, size: body.length, category: categorize(url), ok: true })
      console.log(`[+] ${seen.size} ${name} (${body.length})`)
    } catch (err) {
      seen.set(url, { ok: false, error: String(err) })
    }
  })

  console.log('[PG54] 打开试玩页…')
  await page.goto(GAME_URL, { waitUntil: 'domcontentloaded', timeout: 120000 })

  // 等待加载 + 尝试点「开始」
  for (let i = 0; i < 90; i++) {
    await sleep(1000)
    const canvas = await page.$('#GameCanvas')
    const started = await page.$('#__startedButton')
    if (started) {
      try {
        await started.click({ timeout: 2000 })
        console.log('[PG54] 点击开始')
      } catch (_) {}
    }
    if (canvas && seen.size > 80) break
    if (i % 15 === 14) console.log(`[PG54] 等待资源… ${seen.size} 个, ${i + 1}s`)
  }

  await sleep(5000)
  await browser.close()

  const manifest = {
    collectedAt: new Date().toISOString(),
    page: GAME_URL,
    gameId: '54',
    mode: 'playwright',
    summary: { total: seen.size },
    items: [...seen.entries()].map(([url, meta]) => ({ url, ...meta })),
  }
  fs.writeFileSync(path.join(OUT, 'pg-assets-manifest.json'), JSON.stringify(manifest, null, 2))
  console.log(`[PG54] 完成: ${seen.size} 个文件 -> ${OUT}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
