/**
 * probe17 — 验证「收起侧边栏后仍能恢复」的修复。
 * 三段：expanded → 点宿主按钮进 rail → 点插件按钮回到 expanded。
 */
import { chromium } from "playwright-core";
import fs from "node:fs";

const token = process.env.DSH_TOKEN;
if (!token) throw new Error("DSH_TOKEN env missing");
const OUT = "p17.json";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(`http://127.0.0.1:43129/?token=${token}`, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);

// 关掉 dsh-auto-memory 欢迎向导（会盖住界面）
const skip = page.getByText("跳过向导", { exact: false });
if (await skip.count()) {
  await skip.first().click().catch(() => {});
  await page.waitForTimeout(1200);
}

const snapshot = async (phase) => {
  const data = await page.evaluate(() => {
    const col = document.querySelector("[class*='_sidebarCol']");
    const row = document.querySelector("[class*='_sidebarCol'] [class*='_logoRow']");
    const mine = document.querySelector(".cindy-nav-toggle");
    const host = document.querySelector("[class*='_sidebarCol'] [class*='_logoRow'] [class*='_toggle']");
    const rect = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        x: Math.round(r.x), y: Math.round(r.y),
        w: Math.round(r.width), h: Math.round(r.height),
        display: cs.display, opacity: cs.opacity, visibility: cs.visibility,
      };
    };
    // 命中测试：插件按钮中心点上最顶层的元素是否是自己
    let hitSelf = null;
    if (mine) {
      const r = mine.getBoundingClientRect();
      const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      hitSelf = !!(top && (top === mine || mine.contains(top)));
    }
    let hostHitSelf = null;
    let hostReopen = null;
    if (host) {
      const r = host.getBoundingClientRect();
      if (r.width > 0) {
        const top = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
        hostHitSelf = !!(top && (top === host || host.contains(top)));
      }
      hostReopen = host.getAttribute("aria-label");
    }
    const rowChildren = row
      ? Array.from(row.children).map((c) => `${c.className.replace(/\s+/g, " ").slice(0, 46)}|${c.getAttribute("aria-label") || ""}`)
      : null;
    return {
      colW: col ? Math.round(col.getBoundingClientRect().width) : null,
      railAttr: document.documentElement.getAttribute("data-cindy-rail"),
      rowW: row ? Math.round(row.getBoundingClientRect().width) : null,
      mine: rect(mine),
      mineAria: mine ? mine.getAttribute("aria-label") : null,
      hitSelf,
      host: rect(host),
      hostAria: hostReopen,
      hostHitSelf,
      rowChildren,
    };
  });
  return { phase, ...data };
};

const phases = [];
phases.push(await snapshot("expanded"));
await page.screenshot({ path: "p17-expanded.png", clip: { x: 0, y: 0, width: 300, height: 92 } });

// 点宿主「收起侧边栏」
await page.locator("[aria-label*='收起侧边栏']").first().click();
await page.waitForTimeout(1200);
phases.push(await snapshot("rail"));
await page.screenshot({ path: "p17-rail.png", clip: { x: 0, y: 0, width: 300, height: 92 } });

// 关键验证：点插件按钮应回到展开态
try {
  await page.locator(".cindy-nav-toggle").first().click({ timeout: 5000 });
  await page.waitForTimeout(1400);
} catch (err) {
  phases.push({ phase: "click-toggle-FAILED", error: String(err).slice(0, 200) });
}
phases.push(await snapshot("after-toggle-click"));
await page.screenshot({ path: "p17-restored.png", clip: { x: 0, y: 0, width: 300, height: 92 } });

fs.writeFileSync(OUT, JSON.stringify({ phases }, null, 2));
console.log(
  JSON.stringify(
    phases.map((p) => ({ phase: p.phase, colW: p.colW, railAttr: p.railAttr, mine: p.mine && p.mine.display, hitSelf: p.hitSelf, host: p.host && p.host.display })),
    null,
    1,
  ),
);
await browser.close();
