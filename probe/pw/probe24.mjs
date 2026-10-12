/**
 * probe24 — 验证 rail（含 Windows 标题栏零宽）态的 body 级恢复浮标 .cindy-nav-rail-float
 *
 * 背景：probe23 证明 _sidebarCol 零宽时，列内按钮即使 position:fixed 也会被内容区盖住、
 * 点击超时。改为把恢复入口挂到 document.body 下。
 *
 * 用法：
 *   $env:DSH_TOKEN = "<harness.log 末行 token>"
 *   node probe24.mjs
 */
import { chromium } from "playwright-core";

const token = process.env.DSH_TOKEN;
if (!token) {
  console.error("DSH_TOKEN is required");
  process.exit(1);
}

const W = Number(process.env.W || 1280);
const H = Number(process.env.H || 883);
const url = `http://127.0.0.1:43129/?token=${token}`;

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto(url, { waitUntil: "networkidle" });

// 关掉 dsh-auto-memory 欢迎向导，否则会盖住界面
const skip = page.locator("text=跳过向导").first();
if (await skip.count()) {
  await skip.click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(400);
}

// 复现真实 Windows 标题栏环境（用户实机带原生菜单栏）
await page.evaluate(() => document.documentElement.setAttribute("data-windows-titlebar", ""));
await page.waitForTimeout(400);

const out = { viewport: { W, H } };

const snapCol = () =>
  page.evaluate(() => {
    const col = document.querySelector("[class*='_sidebarCol']");
    return {
      colW: col ? Math.round(col.getBoundingClientRect().width) : null,
      railAttr: document.documentElement.getAttribute("data-cindy-rail"),
    };
  });

const snapFloat = (sel) =>
  page.evaluate((s) => {
    const el = document.querySelector(s);
    if (!el) return { present: false };
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const cx = Math.round(r.x + r.width / 2);
    const cy = Math.round(r.y + r.height / 2);
    let chain = [];
    let node = document.elementFromPoint(cx, cy);
    let hitSelf = false;
    for (let i = 0; i < 8 && node; i++) {
      chain.push({
        tag: node.tagName,
        cls: (node.className || "").toString().slice(0, 80),
        aria: node.getAttribute && node.getAttribute("aria-label"),
      });
      if (node === el || (node.closest && node.closest(s))) hitSelf = true;
      node = node.parentElement;
    }
    return {
      present: true,
      display: cs.display,
      visibility: cs.visibility,
      opacity: cs.opacity,
      position: cs.position,
      left: cs.left,
      top: cs.top,
      zIndex: cs.zIndex,
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      hitIsSelfOrChild: hitSelf,
      hitChain: chain,
      parentTag: el.parentElement ? el.parentElement.tagName : null,
      parentCls: el.parentElement ? (el.parentElement.className || "").toString().slice(0, 60) : null,
    };
  }, sel);

// ── 1. expanded ────────────────────────────────────────────────
out.expanded = { ...(await snapCol()), float: await snapFloat(".cindy-nav-rail-float") };

// ── 2. 点宿主「收起侧边栏」→ rail ──────────────────────────────
try {
  await page
    .locator("[class*='_sidebarCol'] [class*='_logoRow'] [class*='_toggle']")
    .first()
    .click({ timeout: 5000 });
  out.hostClick = "ok";
} catch (err) {
  out.hostClick = "fail: " + String(err).slice(0, 160);
}
await page.waitForTimeout(900);

out.rail = {
  ...(await snapCol()),
  mainToggle: await snapFloat(".cindy-nav-toggle"),
  railFloat: await snapFloat(".cindy-nav-rail-float"),
};

await page.screenshot({ path: "p24-rail.png", clip: { x: 0, y: 0, width: 360, height: 100 } });
await page.screenshot({ path: "p24-rail-full.png" });

// ── 3. 点浮标 → 应恢复 ────────────────────────────────────────
try {
  await page.locator(".cindy-nav-rail-float").first().click({ timeout: 4000 });
  out.floatClick = "ok";
} catch (err) {
  out.floatClick = "fail: " + String(err).slice(0, 160);
}
await page.waitForTimeout(800);

out.recovered = { ...(await snapCol()), float: await snapFloat(".cindy-nav-rail-float") };
await page.screenshot({ path: "p24-recovered.png", clip: { x: 0, y: 0, width: 360, height: 100 } });

console.log(JSON.stringify(out, null, 2));
await browser.close();
