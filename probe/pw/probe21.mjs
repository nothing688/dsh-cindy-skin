/* probe21：模拟 Windows titlebar 模式，验证宿主 `position:fixed;left:12px` 是否为真因
 * 依据：styles 里存在 `[data-windows-titlebar] .hHd-Xa_toggle{...position:fixed;left:12px}`，
 *       该规则会让「收起侧边栏」脱离 flex 流固定到窗口左上角 —— 此时 flex order 无效。
 * 本探针在无该属性的 headless 环境里手动补上属性，观察顺序是否翻转为「宿主按钮在最左」。
 */
import { chromium } from "playwright-core";
import fs from "node:fs";

const TOKEN = process.env.DSH_TOKEN;
const W = Number(process.env.W || 1280);
const H = Number(process.env.H || 883);
const OUT = process.cwd();

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto(`http://127.0.0.1:43129/?token=${TOKEN}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2600);
try {
  const skip = page.locator("text=跳过向导").first();
  if (await skip.isVisible({ timeout: 2000 })) await skip.click();
} catch {
  /* 无向导 */
}
await page.waitForTimeout(900);

const snap = () =>
  page.evaluate(() => {
    const row = document.querySelector("[class*='_sidebarCol'] [class*='_logoRow']");
    if (!row) return { err: "no row" };
    const host = row.querySelector("[class*='_toggle']");
    const hs = host ? getComputedStyle(host) : null;
    const kids = [...row.children].map((el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return {
        aria: el.getAttribute("aria-label"),
        x: Math.round(r.x),
        y: Math.round(r.y),
        w: Math.round(r.width),
        order: s.order,
        position: s.position,
      };
    });
    return {
      visualOrder: [...kids].sort((a, b) => a.x - b.x).map((k) => `${k.aria}@${k.x}`),
      hostToggle: hs ? { position: hs.position, left: hs.left, top: hs.top, zIndex: hs.zIndex, order: hs.order } : null,
      rowH: Math.round(row.getBoundingClientRect().height),
      kids,
    };
  });

const before = await snap();
await page.screenshot({ path: `${OUT}/p21-before.png` });

// 手动补上 Windows titlebar 属性（html 与 body 都试），观察是否复现用户现象
await page.evaluate(() => {
  document.documentElement.setAttribute("data-windows-titlebar", "");
});
await page.waitForTimeout(600);
const afterHtml = await snap();
await page.screenshot({ path: `${OUT}/p21-titlebar-html.png` });

// 额外：确认是否有别的祖先承载该属性（按 CSS 规则反推）
const attrHosts = await page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll("*")) {
    for (const a of el.attributes || []) {
      if (a.name.startsWith("data-") && /titlebar|windows|platform|os/i.test(a.name)) {
        out.push(`${el.tagName.toLowerCase()}.${String(el.className || "").slice(0, 24)}[${a.name}="${a.value}"]`);
      }
    }
  }
  return out.slice(0, 20);
});

const result = { width: W, before, afterHtml, attrHosts };
fs.writeFileSync(`${OUT}/p21.json`, JSON.stringify(result, null, 1), "utf8");
console.log(JSON.stringify(result, null, 1));
await browser.close();
