// 只读探针：打开 DSH Web 界面，读取主题 token 的实际值与插件痕迹。
// 用法: node probe.mjs <token>
import { chromium } from 'playwright-core'

const TOKEN = process.argv[2]
if (!TOKEN) {
  console.error('usage: node probe.mjs <token>')
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
const context = await browser.newContext({ viewport: { width: 1500, height: 950 } })
const page = await context.newPage()

const logs = []
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))
page.on('requestfailed', (r) => logs.push(`[reqfail] ${r.url().slice(0, 120)} :: ${r.failure()?.errorText}`))

await page
  .goto(url, { waitUntil: 'domcontentloaded', timeout: 90000 })
  .catch((e) => logs.push(`goto: ${e.message}`))

await page.waitForTimeout(9000)

const probe = await page.evaluate(() => {
  const cs = getComputedStyle(document.body)
  const sidebar = document.querySelector('[class*="_sidebarCol"]')
  return {
    darkAttr: document.body.hasAttribute('data-ds-dark-theme'),
    bodyBg: cs.backgroundColor,
    inlineProps: document.body.style.length,
    inline: {
      bgBase: document.body.style.getPropertyValue('--dsw-alias-bg-base'),
      fontFamily: document.body.style.getPropertyValue('--dsw-font-family').slice(0, 90),
      radiusMd: document.body.style.getPropertyValue('--dsw-radius-md'),
      shadowLv1: document.body.style.getPropertyValue('--dsw-shadow-lv1'),
    },
    computed: {
      bgBase: cs.getPropertyValue('--dsw-alias-bg-base').trim(),
      bgLayer1: cs.getPropertyValue('--dsw-alias-bg-layer-1').trim(),
      sidebarFill: cs.getPropertyValue('--dsw-specific-sidebar-fill').trim(),
      fontFamily: cs.getPropertyValue('--dsw-font-family').trim().slice(0, 90),
      radiusMd: cs.getPropertyValue('--dsw-radius-md').trim(),
      borderL3: cs.getPropertyValue('--dsw-alias-border-l3').trim(),
      citation: cs.getPropertyValue('--dsw-alias-markdown-citation').trim(),
      staticBluish60: cs.getPropertyValue('--dsw-static-neutral-bluish-60').trim(),
    },
    pluginStyleTags: [...document.querySelectorAll('style[data-plugin]')].map(
      (s) => `${s.dataset.plugin}/${s.dataset.pluginCss}`
    ),
    cindyStyleCount: document.querySelectorAll('style[data-plugin="dsh-cindy-skin"]').length,
    sidebarBg: sidebar ? getComputedStyle(sidebar).backgroundColor : null,
    interFonts: [...document.fonts]
      .filter((f) => /inter/i.test(f.family))
      .map((f) => `${f.family}:${f.weight}:${f.status}`)
      .slice(0, 10),
    bodyFontFamily: cs.fontFamily.slice(0, 120),
  }
})

console.log('=== PROBE ===')
console.log(JSON.stringify(probe, null, 2))

const interesting = logs.filter((l) => /cindy|theme|error|fail|Inter/i.test(l))
console.log('=== CONSOLE (filtered, ' + interesting.length + '/' + logs.length + ') ===')
console.log(interesting.slice(0, 60).join('\n'))

await page.screenshot({ path: 'dsh-shot.png', fullPage: false }).catch(() => {})
await browser.close()
