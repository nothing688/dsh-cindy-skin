// 关掉 dsh-auto-memory 欢迎向导后拍侧栏，并测量侧栏顶部元素与中部区域结构。
// 用法: node probe6.mjs <token>
import { chromium } from 'playwright-core'

const TOKEN = process.argv[2]
if (!TOKEN) {
  console.error('usage: node probe6.mjs <token>')
  process.exit(2)
}
const url = `http://127.0.0.1:43129/?token=${TOKEN}`

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await context.newPage()
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {})
await page.waitForTimeout(9000)

// 关欢迎向导：先点“跳过向导”，不行再按 Esc / 点关闭按钮
let closed = 'none'
for (const step of [
  async () => {
    await page.getByText('跳过向导').first().click({ timeout: 4000 })
    return 'skip-link'
  },
  async () => {
    await page.keyboard.press('Escape')
    return 'escape'
  },
]) {
  try {
    closed = await step()
    break
  } catch {
    /* try next */
  }
}
await page.waitForTimeout(1500)

const sidebar = page.locator('[class*="_sidebarCol"]').first()
await sidebar.screenshot({ path: 'dsh-sidebar.png' }).catch((e) => console.log('sidebar shot fail', String(e).slice(0, 120)))
await page.screenshot({ path: 'dsh-full.png' }).catch(() => {})

const info = await page.evaluate(() => {
  const sb = document.querySelector('[class*="_sidebarCol"]')
  if (!sb) return { sidebar: null }
  const rc = (el) => {
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
  }
  const own = (el) => ({
    tag: el.tagName,
    cls: String(el.className || '').slice(0, 46),
    label: (el.getAttribute('aria-label') || el.getAttribute('title') || '').slice(0, 22),
    txt: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 18),
    pos: getComputedStyle(el).position,
    rect: rc(el),
  })
  const topZone = [...sb.querySelectorAll('*')].filter((el) => {
    const r = el.getBoundingClientRect()
    return r.y < 70 && r.height > 0 && r.width > 0 && r.width < 300
  })
  const blocks = [...sb.children].map((el) => ({
    ...own(el),
    overflowY: getComputedStyle(el).overflowY,
    scrollH: el.scrollHeight,
    clientH: el.clientHeight,
  }))
  // 找中部可滚动容器（工作区/会话列表区）
  const scrollers = [...sb.querySelectorAll('*')]
    .filter((el) => {
      const s = getComputedStyle(el)
      return (s.overflowY === 'auto' || s.overflowY === 'scroll') && el.scrollHeight > 0
    })
    .slice(0, 8)
    .map((el) => ({
      cls: String(el.className || '').slice(0, 46),
      rect: rc(el),
      overflowY: getComputedStyle(el).overflowY,
      scrollH: el.scrollHeight,
      clientH: el.clientHeight,
      scrollable: el.scrollHeight > el.clientHeight + 2,
    }))
  return {
    sidebar: rc(sb),
    topZone: topZone.map(own),
    blocks,
    scrollers,
  }
})
console.log('=== closed wizard by ===', closed)
console.log(JSON.stringify(info, null, 1))
await browser.close()
