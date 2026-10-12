// 在真实页面上试算 A（导航折叠）+ B（紧凑化）两套候选 CSS，测量前后变化并截图，不写插件。
// 用法: node probe8.mjs <token>
import { chromium } from 'playwright-core'

const TOKEN = process.argv[2]
if (!TOKEN) {
  console.error('usage: node probe8.mjs <token>')
  process.exit(2)
}
const url = `http://127.0.0.1:43129/?token=${TOKEN}`

const COMPACT_CSS = `
[class*="_sidebarCol"] [class*="_panelRow"] { height: 30px !important; min-height: 30px !important; }
[class*="_sidebarCol"] [class*="dshWbSidebarSwitcher"] { height: 30px !important; min-height: 30px !important; }
[class*="_sidebarCol"] [class*="dshWbWorkbenchHome"] { height: 30px !important; }
[class*="_sidebarCol"] [class*="_newSession"] { height: 34px !important; }
[class*="_sidebarCol"] [class*="_logoRow"] { height: 52px !important; }
`
const COLLAPSE_CSS = `
html[data-cindy-nav-collapsed] [class*="_sidebarCol"] [class*="_panelList"] { display: none !important; }
html[data-cindy-nav-collapsed] [class*="_sidebarCol"] [class*="dshWbSidebarSwitcher"] { display: none !important; }
`

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

const MEASURE = () => {
  const q = (s) => document.querySelector(s)
  const rc = (el) => {
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { y: Math.round(r.y), h: Math.round(r.height) }
  }
  const sb = q('[class*="_sidebarCol"]')
  const list = sb && sb.querySelector('[class*="bhn1Oq_list"]')
  const rows = sb ? [...sb.querySelectorAll('[class*="_panelRow"]')].map((el) => Math.round(el.getBoundingClientRect().height)) : []
  return {
    logoRow: rc(sb && sb.querySelector('[class*="_logoRow"]')),
    newSession: rc(sb && sb.querySelector('[class*="_newSession"]')),
    workbench: rc(sb && sb.querySelector('[class*="dshWbSidebarSwitcher"]')),
    panelList: rc(sb && sb.querySelector('[class*="_panelList"]')),
    regionArea: rc(sb && sb.querySelector('[class*="_regionArea"]')),
    footArea: rc(sb && sb.querySelector('[class*="_footArea"]')),
    listBox: list ? { ...rc(list), scrollH: list.scrollHeight, clientH: list.clientHeight } : null,
    panelRowHeights: rows,
  }
}

const base = await page.evaluate(MEASURE)

// B: 紧凑化
await page.addStyleTag({ content: COMPACT_CSS })
await page.waitForTimeout(400)
const afterCompact = await page.evaluate(MEASURE)
await page.screenshot({ path: 'dsh-compact.png' }).catch(() => {})
await page.locator('[class*="_sidebarCol"]').first().screenshot({ path: 'dsh-compact-sidebar.png' }).catch(() => {})

// A: 折叠导航组
await page.addStyleTag({ content: COLLAPSE_CSS })
await page.evaluate(() => document.documentElement.setAttribute('data-cindy-nav-collapsed', '1'))
await page.waitForTimeout(400)
const afterCollapse = await page.evaluate(MEASURE)
await page.locator('[class*="_sidebarCol"]').first().screenshot({ path: 'dsh-collapsed-sidebar.png' }).catch(() => {})

const fmt = (o) => JSON.stringify(o)
console.log('BASE          ', fmt(base))
console.log('+COMPACT      ', fmt(afterCompact))
console.log('+COLLAPSE     ', fmt(afterCollapse))
await browser.close()
