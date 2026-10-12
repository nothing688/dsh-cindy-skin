/* probe20：logo 行按钮「视觉顺序」取证
 * 目标：确认 SIDEBAR_SPACE_CSS 的 flex order 是否真的落到宿主「收起侧边栏」按钮上，
 *       以及当前实际渲染的视觉顺序（按 x 坐标排序）是否 = 品牌 → ⌄⌃ → 宿主按钮。
 * 用法：$env:DSH_TOKEN 取自 harness.log 末行；可选 $env:W / $env:H。
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
  /* 没有向导就继续 */
}
await page.waitForTimeout(900);

const data = await page.evaluate(() => {
  const row = document.querySelector("[class*='_sidebarCol'] [class*='_logoRow']");
  if (!row) return { err: "logoRow not found" };
  const col = document.querySelector("[class*='_sidebarCol']");
  const kids = [...row.children].map((el) => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return {
      cls: String(el.className || "").slice(0, 64),
      aria: el.getAttribute("aria-label"),
      x: Math.round(r.x),
      w: Math.round(r.width),
      order: s.order,
      display: s.display,
      opacity: s.opacity,
    };
  });
  const styles = [...document.querySelectorAll("style")]
    .map((s) => s.textContent || "")
    .filter((t) => t.includes("_logoRow") && t.includes("order:"));
  return {
    colW: Math.round(col.getBoundingClientRect().width),
    railAttr: document.documentElement.getAttribute("data-cindy-rail"),
    rowGap: getComputedStyle(row).gap,
    rowDisplay: getComputedStyle(row).display,
    domOrder: kids.map((k) => `${k.aria || k.cls.split(" ")[0]}@${k.x}(order=${k.order})`),
    visualOrder: [...kids].sort((a, b) => a.x - b.x).map((k) => `${k.aria || k.cls.split(" ")[0]}@${k.x}`),
    kids,
    orderRuleSnippets: styles.map((t) => {
      const i = t.indexOf("_logoRow");
      return t.slice(Math.max(0, i - 30), i + 260).replace(/\s+/g, " ");
    }),
  };
});

fs.writeFileSync(`${OUT}/p20.json`, JSON.stringify({ width: W, height: H, data }, null, 1), "utf8");
await page.screenshot({ path: `${OUT}/p20-full.png` });
try {
  await page.locator("[class*='_sidebarCol']").screenshot({ path: `${OUT}/p20-sidebar.png` });
} catch {
  /* 截图失败不影响结论 */
}
console.log(JSON.stringify(data, null, 1));
await browser.close();
