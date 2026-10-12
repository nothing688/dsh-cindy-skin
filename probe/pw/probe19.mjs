/**
 * probe19 — 多宽度 × 展开/收起 完整取证。
 * 目的：找出「用户截图布局 ≠ 1280 探针布局」的原因，以及 rail 态到底哪里不对。
 */
import { chromium } from "playwright-core";
import fs from "node:fs";

const token = process.env.DSH_TOKEN;
if (!token) throw new Error("DSH_TOKEN env missing");
const WIDTHS = (process.env.WIDTHS || "900,1100,1280").split(",").map(Number);

const browser = await chromium.launch({ channel: "msedge", headless: true });
const out = {};

const SNAP = () => {
  const col = document.querySelector("[class*='_sidebarCol']");
  const row = col ? col.querySelector("[class*='_logoRow']") : null;
  const pack = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName,
      cls: (el.className || "").toString(),
      aria: el.getAttribute("aria-label"),
      x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      display: cs.display, opacity: +(+cs.opacity).toFixed(2), flex: cs.flex,
    };
  };
  const allBtns = Array.from(document.querySelectorAll("button")).filter((b) => {
    const r = b.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && Math.round(b.getBoundingClientRect().x) < 320;
  });
  return {
    colW: col ? Math.round(col.getBoundingClientRect().width) : null,
    railAttr: document.documentElement.getAttribute("data-cindy-rail"),
    rowW: row ? Math.round(row.getBoundingClientRect().width) : null,
    rowOrder: row ? Array.from(row.children).map(pack) : null,
    // rail 态时宿主按钮 class 会不会变？全量列出侧栏区所有按钮
    sidebarButtons: allBtns.map(pack),
    // 每个按钮的中心点到底命中谁
    hits: Array.from(row ? row.children : []).map((el) => {
      const r = el.getBoundingClientRect();
      if (r.width === 0) return { cls: (el.className || "").toString(), hit: null };
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return {
        cls: (el.className || "").toString(),
        hitCls: hit ? (hit.className || hit.tagName).toString().slice(0, 60) : null,
        hitSelf: hit === el || (el.contains(hit) && !!hit),
      };
    }),
  };
};

for (const W of WIDTHS) {
  const page = await browser.newPage({ viewport: { width: W, height: 800 } });
  await page.goto(`http://127.0.0.1:43129/?token=${token}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2200);
  const skip = page.getByText("跳过向导", { exact: false });
  if (await skip.count()) {
    await skip.first().click().catch(() => {});
    await page.waitForTimeout(1000);
  }

  const expanded = await page.evaluate(SNAP);

  // 点宿主收起按钮 → rail
  let rail = null;
  let recovered = null;
  let err = null;
  try {
    const host = page.locator("[class*='_sidebarCol'] [class*='_logoRow'] [aria-label*='收起侧边栏']").first();
    await host.click({ timeout: 8000 });
    await page.waitForTimeout(900);
    rail = await page.evaluate(SNAP);
    await page.screenshot({ path: `p19-${W}-rail.png` });
    // 点插件按钮尝试恢复
    const mine = page.locator(".cindy-nav-toggle").first();
    await mine.click({ timeout: 8000 });
    await page.waitForTimeout(900);
    recovered = await page.evaluate(SNAP);
    await page.screenshot({ path: `p19-${W}-recovered.png` });
  } catch (e) {
    err = String(e.message || e).slice(0, 240);
  }
  await page.screenshot({ path: `p19-${W}-expanded.png` });
  out[W] = { expanded, rail, recovered, err };
  await page.close();
}

fs.writeFileSync("p19.json", JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
await browser.close();
