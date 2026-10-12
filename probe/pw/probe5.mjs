// 诊断「收起侧边栏按钮错位」是否由插件的 sidebar-glass.css（backdrop-filter 会成为
// position:fixed 后代的包含块）引起：先测量，再临时移除该 style，再测量对比。
// 用法: node probe5.mjs <token>
import { chromium } from 'playwright-core'

const TOKEN = process.argv[2]
if (!TOKEN) {
  console.error('usage: node probe5.mjs <token>')
  process.exit(2)
}
const url = `http://127.0.0.1:43129/?token=${TOKEN}`

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch(() => {})
await page.waitForTimeout(9000)

const SNAP = () => {
  const sidebar = document.querySelector('[class*="_sidebarCol"]')
  const rect = (el) => {
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }
  }
  const fixedSmall = [...document.querySelectorAll('body *')]
    .filter((el) => {
      const s = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      return s.position === 'fixed' && r.width > 0 && r.height > 0 && r.width < 320
    })
    .slice(0, 12)
    .map((el) => ({
      tag: el.tagName,
      label: (el.getAttribute('aria-label') || el.getAttribute('title') || '').slice(0, 30),
      cls: String(el.className || '').slice(0, 50),
      inSidebar: !!(sidebar && sidebar.contains(el)),
      rect: rect(el),
    }))
  const sidebarButtons = sidebar
    ? [...sidebar.querySelectorAll('button,[role="button"],a[href]')].slice(0, 30).map((el) => ({
        label: (el.getAttribute('aria-label') || el.getAttribute('title') || el.textContent || '').trim().slice(0, 24),
        pos: getComputedStyle(el).position,
        rect: rect(el),
      }))
    : []
  const sc = sidebar ? getComputedStyle(sidebar) : null
  return {
    sidebar: sidebar ? rect(sidebar) : null,
    sidebarBackdrop: sc ? sc.backdropFilter || sc.webkitBackdropFilter : null,
    fixedSmall,
    sidebarButtons,
  }
}

const before = await page.evaluate(SNAP)
const removed = await page.evaluate(() => {
  const t = document.querySelector('style[data-plugin-css="dsh-cindy-skin/sidebar-glass.css"]')
  if (t) {
    t.remove()
    return true
  }
  return false
})
await page.waitForTimeout(600)
const after = await page.evaluate(SNAP)

console.log('=== removed glass style ===', removed)
console.log('=== BEFORE (glass on) ===')
console.log(JSON.stringify(before, null, 2))
console.log('=== AFTER (glass off) ===')
console.log(JSON.stringify(after, null, 2))
await page.screenshot({ path: 'dsh-glass-on.png' }).catch(() => {})
await browser.close()
