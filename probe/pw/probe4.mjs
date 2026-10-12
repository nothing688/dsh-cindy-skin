// M2 复审探针：确认新一批 token 覆盖与侧栏玻璃样式是否已被宿主加载。
// 用法: node probe4.mjs <token>
import { chromium } from 'playwright-core'

const TOKEN = process.argv[2]
if (!TOKEN) {
  console.error('usage: node probe4.mjs <token>')
  process.exit(2)
}
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
const context = await browser.newContext({ viewport: { width: 1500, height: 950 } })
const page = await context.newPage()
const logs = []
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))

await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 }).catch((e) => logs.push(`goto: ${e.message}`))
await page.waitForTimeout(9000)

const probe = await page.evaluate(() => {
  const cs = getComputedStyle(document.body)
  const sidebar = document.querySelector('[class*="_sidebarCol"]')
  const scs = sidebar ? getComputedStyle(sidebar) : null
  const inlineNames = []
  for (let i = 0; i < document.body.style.length; i += 1) inlineNames.push(document.body.style[i])
  return {
    inlineCount: document.body.style.length,
    tokenCount: inlineNames.length,
    hasBrandNew: inlineNames.includes('--dsw-alias-brand-primary-new-colorprimary-new-color'),
    hasInlineCode: inlineNames.includes('--dsw-alias-markdown-inline-code'),
    hasScrollbar: inlineNames.includes('--dsw-alias-scrollbar-bg-l1'),
    v: {
      inlineCode: document.body.style.getPropertyValue('--dsw-alias-markdown-inline-code'),
      citation: document.body.style.getPropertyValue('--dsw-alias-markdown-citation'),
      brandNew: document.body.style.getPropertyValue('--dsw-alias-brand-primary-new-colorprimary-new-color'),
      scrollBg: document.body.style.getPropertyValue('--dsw-alias-scrollbar-bg-l1'),
      toastBg: document.body.style.getPropertyValue('--dsw-alias-toast-bg'),
      switchThumb: document.body.style.getPropertyValue('--dsw-alias-switch-thumb'),
      codeBlockNow: cs.getPropertyValue('--dsw-alias-markdown-code-block').trim(),
    },
    pluginStyles: [...document.querySelectorAll('style[data-plugin="dsh-cindy-skin"]')].map(
      (s) => s.dataset.pluginCss
    ),
    sidebar: scs
      ? {
          bgColor: scs.backgroundColor,
          bgImage: scs.backgroundImage.slice(0, 90),
          backdrop: scs.backdropFilter || scs.webkitBackdropFilter,
        }
      : null,
  }
})

console.log('=== PROBE4 ===')
console.log(JSON.stringify(probe, null, 2))
const interesting = logs.filter((l) => /cindy|error|fail/i.test(l))
console.log('=== CONSOLE (filtered ' + interesting.length + '/' + logs.length + ') ===')
console.log(interesting.slice(0, 40).join('\n'))
await page.screenshot({ path: 'dsh-m2.png' }).catch(() => {})
await browser.close()
