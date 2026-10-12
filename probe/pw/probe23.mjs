// probe23: 诊断 rail(零宽) 态下 .cindy-nav-toggle 为何 elementFromPoint 命中不到自己
// 关键：先补 data-windows-titlebar 复现真实 Windows 标题栏环境
import { chromium } from "playwright-core";

const token = process.env.DSH_TOKEN;
const W = Number(process.env.W || 1280);
const H = Number(process.env.H || 883);
const url = `http://127.0.0.1:43129/?token=${token}`;

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto(url, { waitUntil: "networkidle" });

// 关掉 dsh-auto-memory 欢迎向导
const skip = page.locator("text=跳过向导").first();
if (await skip.count()) {
  try { await skip.click({ timeout: 3000 }); } catch { /* ignore */ }
}
await page.waitForTimeout(400);

// 复现真实 Windows 标题栏环境
await page.evaluate(() => document.documentElement.setAttribute("data-windows-titlebar", ""));
await page.waitForTimeout(400);

const out = {};

// 展开态基线
out.expanded = await page.evaluate(() => {
  const col = document.querySelector("[class*='_sidebarCol']");
  return {
    colW: col ? Math.round(col.getBoundingClientRect().width) : null,
    railAttr: document.documentElement.getAttribute("data-cindy-rail"),
  };
});

// 点宿主收起按钮
try {
  await page.locator("[class*='_sidebarCol'] [class*='_logoRow'] [class*='_toggle']").first().click({ timeout: 5000 });
} catch (e) {
  out.hostClickError = String(e).slice(0, 200);
}
await page.waitForTimeout(800);

out.rail = await page.evaluate(() => {
  const res = {};
  const col = document.querySelector("[class*='_sidebarCol']");
  if (col) {
    const s = getComputedStyle(col);
    res.col = {
      w: Math.round(col.getBoundingClientRect().width),
      overflow: s.overflow, position: s.position, transform: s.transform, filter: s.filter,
    };
  }
  res.railAttr = document.documentElement.getAttribute("data-cindy-rail");

  const mine = document.querySelector(".cindy-nav-toggle");
  res.mineInDom = !!mine;
  if (!mine) return res;

  const s = getComputedStyle(mine);
  const r = mine.getBoundingClientRect();
  res.mine = {
    display: s.display, visibility: s.visibility, opacity: s.opacity,
    position: s.position, left: s.left, top: s.top, zIndex: s.zIndex,
    transform: s.transform,
    rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
  };

  const cx = Math.round(r.x + r.width / 2);
  const cy = Math.round(r.y + r.height / 2);
  res.probePoint = { cx, cy };

  // 命中链：elementFromPoint 返回的元素 + 其祖先
  res.centerHits = [];
  let el = document.elementFromPoint(cx, cy);
  let depth = 0;
  while (el && depth < 8) {
    const es = getComputedStyle(el);
    res.centerHits.push({
      tag: el.tagName,
      cls: String(el.className || "").slice(0, 60),
      aria: el.getAttribute && el.getAttribute("aria-label"),
      pos: es.position, z: es.zIndex, pe: es.pointerEvents, op: es.opacity,
    });
    el = el.parentElement;
    depth++;
  }
  res.hitIsSelfOrChild = !!document.elementFromPoint(cx, cy)?.closest?.(".cindy-nav-toggle");

  // 祖先链：查是否有 transform / filter / will-change 把 fixed 降级
  res.ancestors = [];
  let a = mine.parentElement;
  let n = 0;
  while (a && n < 10) {
    const as = getComputedStyle(a);
    const ar = a.getBoundingClientRect();
    res.ancestors.push({
      tag: a.tagName,
      cls: String(a.className || "").slice(0, 46),
      w: Math.round(ar.width), x: Math.round(ar.x),
      position: as.position, overflow: as.overflow,
      transform: as.transform === "none" ? "none" : as.transform.slice(0, 40),
      filter: as.filter === "none" ? "none" : as.filter.slice(0, 30),
      willChange: as.willChange, contain: as.contain,
      z: as.zIndex,
    });
    a = a.parentElement;
    n++;
  }
  return res;
});

// 尝试点击插件按钮（应能恢复）
try {
  await page.locator(".cindy-nav-toggle").first().click({ timeout: 4000 });
  out.mineClick = "ok";
} catch (e) {
  out.mineClick = "fail: " + String(e).split("\n")[0].slice(0, 140);
}
await page.waitForTimeout(600);

out.afterClick = await page.evaluate(() => {
  const col = document.querySelector("[class*='_sidebarCol']");
  return {
    colW: col ? Math.round(col.getBoundingClientRect().width) : null,
    railAttr: document.documentElement.getAttribute("data-cindy-rail"),
  };
});

out.viewport = { W, H };
console.log(JSON.stringify(out, null, 2));
await browser.close();
