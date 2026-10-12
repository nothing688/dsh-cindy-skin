/**
 * probe29 — 列出侧栏「底部区域」的元素（供压缩底部空间用）。
 *
 *   $env:DSH_TOKEN = "<harness.log 末行 token>"
 *   node probe29.mjs
 */
import { chromium } from "playwright-core";

const token = process.env.DSH_TOKEN;
if (!token) {
  console.error("DSH_TOKEN is required");
  process.exit(1);
}

const W = Number(process.env.W || 1280);
const H = Number(process.env.H || 883);
const BOTTOM_BAND = Number(process.env.BAND || 260);

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto(`http://127.0.0.1:43129/?token=${token}`, { waitUntil: "networkidle" });

const skip = page.locator("text=跳过向导").first();
if (await skip.count()) {
  await skip.click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(400);
}
await page.evaluate(() => {
  document.documentElement.setAttribute("data-windows-titlebar", "");
  document.documentElement.style.setProperty("--dsh-windows-titlebar-height", "40px");
});
await page.waitForTimeout(500);

const out = await page.evaluate((band) => {
  const yMin = window.innerHeight - band;
  const rows = [];
  const col = document.querySelector("[class*='_sidebarCol']");
  const colRect = col ? col.getBoundingClientRect() : null;

  for (const el of document.querySelectorAll("[class*='_sidebarCol'] *")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    if (r.y + r.height < yMin) continue;
    const cs = getComputedStyle(el);
    rows.push({
      tag: el.tagName,
      cls: (el.className || "").toString().slice(0, 66),
      text: (el.textContent || "").trim().slice(0, 20),
      aria: el.getAttribute("aria-label"),
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      pad: cs.padding,
      margin: cs.margin,
      gap: cs.gap,
      display: cs.display,
      kids: el.children.length,
    });
  }
  return {
    viewport: { w: window.innerWidth, h: window.innerHeight },
    bandTop: Math.round(yMin),
    colRect: colRect
      ? { x: Math.round(colRect.x), y: Math.round(colRect.y), w: Math.round(colRect.width), h: Math.round(colRect.height) }
      : null,
    rows: rows.sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x),
  };
}, BOTTOM_BAND);

await page.screenshot({
  path: "p29-sidebar-bottom.png",
  clip: { x: 0, y: Math.max(0, H - BOTTOM_BAND), width: 340, height: BOTTOM_BAND },
});

console.log(JSON.stringify(out, null, 2));
await browser.close();
