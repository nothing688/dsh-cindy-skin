// 只读 dump 侧栏 DOM 骨架（class / 文本 / rect / overflow），为紧凑化与导航折叠定位选择器。
// 用法: node probe7.mjs <token>
import { chromium } from 'playwright-core'

const TOKEN = process.argv[2]
if (!TOKEN) {
  console.error('usage: node probe7.mjs <token>')
  process.exit(2)
}
const url = `http://127.0.0.1:43129/?token=${TOKEN}`

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await context.newPage()
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {})
await page.waitForTimeout(9000)
try {
  await page.getByText('跳过向导').first().click({ timeout: 4000 })
  await page.waitForTimeout(1200)
} catch {
  /* wizard already gone */
}

const tree = await page.evaluate(() => {
  const sb = document.querySelector('[class*="_sidebarCol"]')
  if (!sb) return null
  const out = []
  const SKIP = new Set(['svg', 'path', 'rect', 'circle', 'g', 'use', 'defs', 'span', 'img'])
  const walk = (el, d) => {
    if (d > 5 || out.length > 68) return
    const cls = String(el.className || '')
    const r = el.getBoundingClientRect()
    const t = (el.textContent || '').trim().replace(/\s+/g, ' ')
    const keep = cls || t
    if (keep && !SKIP.has(el.tagName.toLowerCase())) {
      out.push({
        d,
        tag: el.tagName,
        cls: cls.slice(0, 58),
        t: t.slice(0, 14),
        y: Math.round(r.y),
        h: Math.round(r.height),
        w: Math.round(r.width),
        oy: getComputedStyle(el).overflowY === 'auto' || getComputedStyle(el).overflowY === 'scroll' ? 'AUTO' : '',
      })
    }
    for (const c of el.children) walk(c, d + 1)
  }
  walk(sb, 0)
  return out
})

if (!tree) {
  console.log('sidebar not found — token likely stale')
} else {
  for (const r of tree) {
    console.log(
      `${'  '.repeat(r.d)}${r.tag}<${r.cls}> y=${r.y} h=${r.h} w=${r.w} ${r.oy} ${r.t ? '| ' + r.t : ''}`,
    )
  }
}
await browser.close()
