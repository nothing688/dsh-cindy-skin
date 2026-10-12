// 只读探针 v3：进入一个真实会话，采集 markdown 链接 / 内联代码 / 文件 chip 的实际样式。
// 用法: node probe3.mjs <token>
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
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()
const logs = []
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message.slice(0, 200)}`))

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch((e) => logs.push(`goto: ${e.message}`))
await page.waitForTimeout(7000)

for (const label of ['跳过向导', '跳过']) {
  const btn = page.getByText(label, { exact: true }).first()
  if (await btn.count().catch(() => 0)) {
    await btn.click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(2000)
    break
  }
}
await page.waitForTimeout(2000)

// 进入侧栏里第一个真实会话（跳过「新会话」按钮）
const target = page.getByText('Cindy 前端外观与主题设计', { exact: false }).first()
const hit = await target.count().catch(() => 0)
console.log('sidebar session match:', hit)
if (hit) {
  await target.click({ timeout: 5000 }).catch((e) => logs.push('click: ' + e.message.slice(0, 120)))
}
await page.waitForTimeout(9000)
await page.screenshot({ path: 'dsh-conv.png' })

const sample = await page.evaluate(() => {
  const pick = (el) => {
    const cs = getComputedStyle(el)
    return {
      tag: el.tagName,
      cls: String(el.className || '').slice(0, 60),
      text: (el.textContent || '').replace(/\s+/g, ' ').slice(0, 42),
      color: cs.color,
      bg: cs.backgroundColor,
      bgImage: cs.backgroundImage.slice(0, 40),
      border: `${cs.borderTopWidth}/${cs.borderLeftWidth} ${cs.borderTopStyle} ${cs.borderTopColor}`,
      radius: cs.borderRadius,
      pad: cs.padding,
    }
  }
  const q = (sel, n) => [...document.querySelectorAll(sel)].slice(0, n).map(pick)
  return {
    anchors: q('a[href], a', 6),
    codes: q('code', 6),
    pre: q('pre', 3),
    fileish: q('[class*="file" i]', 8),
    chipish: q('[class*="chip" i],[class*="Chip" i],[class*="mention" i],[class*="ref" i]', 8),
    mdRoot: [...document.querySelectorAll('[class*="_markdown_"]')].slice(0, 2).map((el) => {
      const cs = getComputedStyle(el)
      return { cls: String(el.className).slice(0, 40), color: cs.color, bg: cs.backgroundColor }
    }),
    tokens: {
      inlineCode: getComputedStyle(document.body).getPropertyValue('--dsw-alias-markdown-inline-code').trim(),
      codeBlock: getComputedStyle(document.body).getPropertyValue('--dsw-alias-markdown-code-block').trim(),
      citation: getComputedStyle(document.body).getPropertyValue('--dsw-alias-markdown-citation').trim(),
      link: getComputedStyle(document.body).getPropertyValue('--dsw-alias-link').trim(),
      borderL1: getComputedStyle(document.body).getPropertyValue('--dsw-alias-border-l1').trim(),
      staticBluish75: getComputedStyle(document.body).getPropertyValue('--dsw-static-neutral-bluish-75').trim(),
      staticBluish100: getComputedStyle(document.body).getPropertyValue('--dsw-static-neutral-bluish-100').trim(),
    },
  }
})

console.log('=== SAMPLE ===')
console.log(JSON.stringify(sample, null, 2))
if (logs.length) console.log('=== LOGS ===\n' + logs.slice(0, 10).join('\n'))
await browser.close()
