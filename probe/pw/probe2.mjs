// 只读探针 v2：关闭欢迎向导 → 采集真实 DOM 中链接 / chip 的实际样式。
// 用法: node probe2.mjs <token>
import { chromium } from 'playwright-core'

const TOKEN = process.argv[2]
const url = `http://127.0.0.1:43129/?token=${TOKEN}`

async function launchBrowser() {
  const candidates = [
    { channel: 'msedge', headless: true },
    { channel: 'chrome', headless: true },
    {
      executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
      headless: true,
    },
    {
      executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
      headless: true,
    },
  ]
  for (const opts of candidates) {
    try {
      return await chromium.launch(opts)
    } catch (e) {
      console.error('launch failed:', opts.channel ?? opts.executablePath, '::', e.message.split('\n')[0])
    }
  }
  throw new Error('no usable browser')
}

const browser = await launchBrowser()
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
const logs = []
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch((e) => logs.push(`goto: ${e.message}`))
await page.waitForTimeout(7000)

// 关掉可能出现的欢迎向导
for (const label of ['跳过向导', '跳过', 'Skip']) {
  const btn = page.getByText(label, { exact: true }).first()
  if (await btn.count().catch(() => 0)) {
    await btn.click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(2000)
    break
  }
}
await page.waitForTimeout(2500)
await page.screenshot({ path: 'dsh-home.png' })

// 尝试进入侧栏第一个会话（只读浏览，不发送任何内容）
const entered = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('a,button,li,div')].filter((el) => {
    const cls = String(el.className || '')
    return /session|task|conversation/i.test(cls) && el.offsetHeight > 24 && el.textContent.trim().length > 4
  })
  const target = rows[0]
  if (!target) return null
  const text = target.textContent.trim().slice(0, 40)
  target.click()
  return text
})
await page.waitForTimeout(6000)
await page.screenshot({ path: 'dsh-session.png' })

const sample = await page.evaluate(() => {
  const pick = (el) => {
    const cs = getComputedStyle(el)
    return {
      tag: el.tagName,
      cls: String(el.className || '').slice(0, 70),
      text: (el.textContent || '').replace(/\s+/g, ' ').slice(0, 50),
      color: cs.color,
      bg: cs.backgroundColor,
      borderTop: `${cs.borderTopWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`,
      borderLeft: `${cs.borderLeftWidth} ${cs.borderLeftStyle} ${cs.borderLeftColor}`,
      radius: cs.borderRadius,
      boxShadow: cs.boxShadow.slice(0, 70),
      padding: cs.padding,
    }
  }
  const anchors = [...document.querySelectorAll('a')].slice(0, 8).map(pick)
  const chips = [...document.querySelectorAll('[class*="chip" i],[class*="ref" i],[class*="mention" i]')]
    .slice(0, 10)
    .map(pick)
  const fileLinks = [...document.querySelectorAll('[class*="fileLink" i],[class*="FileLink" i]')]
    .slice(0, 5)
    .map(pick)
  return { anchors, chips, fileLinks, bodyBg: getComputedStyle(document.body).backgroundColor }
})

console.log('=== SAMPLE ===')
console.log('entered:', entered)
console.log(JSON.stringify(sample, null, 2))
if (logs.length) console.log('=== LOGS ===\n' + logs.slice(0, 20).join('\n'))
await browser.close()
