/**
 * probe25 — 验证「宿主收起/打开侧边栏按钮保持默认主题行为」：
 *   Windows 标题栏模式下它应由宿主钉在窗口左上角（position:fixed; left:12px），
 *   展开态与收起态都在原位、都可见可点，本插件不再改动它的位置、也不再隐藏它。
 *
 * 用法：
 *   $env:DSH_TOKEN = "<harness.log 末行 token>"
 *   node probe25.mjs
 */
import { chromium } from "playwright-core";
import fs from "node:fs";

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

const skip = page.locator("text=跳过向导").first();
if (await skip.count()) {
  await skip.click({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(400);
}

// 复现真实 Windows 标题栏环境：宿主 preload 会同时做这两件事
//   out/preload/index.cjs:381  root.style.setProperty("--dsh-windows-titlebar-height", `${WINDOWS_TITLEBAR_HEIGHT}px`)
//   WINDOWS_TITLEBAR_HEIGHT = 40（out/preload/index.cjs:231）
// 缺了 height 变量，宿主的 fixed 定位 top 会退化成 static position，收起后跑到视口外（假故障）。
await page.evaluate(() => {
  document.documentElement.setAttribute("data-windows-titlebar", "");
  document.documentElement.style.setProperty("--dsh-windows-titlebar-height", "40px");
});
await page.waitForTimeout(500);

const snap = () =>
  page.evaluate(() => {
    const pick = (sel) => document.querySelector(sel);
    const info = (el) => {
      if (!el) return { present: false };
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      const cx = Math.round(r.x + r.width / 2);
      const cy = Math.round(r.y + r.height / 2);
      const hitEl = document.elementFromPoint(cx, cy);
      return {
        present: true,
        aria: el.getAttribute("aria-label"),
        position: cs.position,
        left: cs.left,
        top: cs.top,
        zIndex: cs.zIndex,
        display: cs.display,
        visibility: cs.visibility,
        opacity: cs.opacity,
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        hitIsSelf: !!(hitEl && (hitEl === el || el.contains(hitEl))),
        hitTag: hitEl ? hitEl.tagName + "." + (hitEl.className || "").toString().slice(0, 44) : null,
      };
    };
    const rectOf = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    const col = pick("[class*='_sidebarCol']");
    const row = pick("[class*='_sidebarCol'] [class*='_logoRow']");
    const host =
      pick("[class*='_iconButton'][class*='_toggle']") || pick("[class*='_logoRow'] [class*='_toggle']");
    const frame = pick("[class*='_frame']");
    return {
      titlebar: document.documentElement.hasAttribute("data-windows-titlebar"),
      titlebarHeightVar: getComputedStyle(document.documentElement)
        .getPropertyValue("--dsh-windows-titlebar-height")
        .trim(),
      framePadTop: frame ? getComputedStyle(frame).paddingTop : null,
      colW: col ? Math.round(col.getBoundingClientRect().width) : null,
      railAttr: document.documentElement.getAttribute("data-cindy-rail"),
      hostToggle: info(host),
      myToggle: info(pick(".cindy-nav-toggle")),
      railFloat: info(pick(".cindy-nav-rail-float")),
      rowRect: rectOf(row),
      brandRect: rectOf(row && row.querySelector("[class*='_brand']")),
      rowChildren: row
        ? Array.from(row.children).map((c) => ({
            cls: (c.className || "").toString().slice(0, 60),
            rect: rectOf(c),
          }))
        : null,
    };
  });

const hostSel = "[class*='_iconButton'][class*='_toggle']";
const out = { viewport: { W, H }, steps: [] };

out.steps.push({ step: "1-expanded", ...(await snap()) });
await page.screenshot({ path: "p25-expanded.png", clip: { x: 0, y: 0, width: 420, height: 120 } });

// 点宿主按钮 → 收起
try {
  await page.locator(hostSel).first().click({ timeout: 5000 });
  out.click1 = "ok";
} catch (err) {
  out.click1 = "fail: " + String(err).slice(0, 140);
}
await page.waitForTimeout(900);
out.steps.push({ step: "2-collapsed", ...(await snap()) });
await page.screenshot({ path: "p25-collapsed.png", clip: { x: 0, y: 0, width: 420, height: 120 } });

// 再点同一个按钮 → 恢复
try {
  await page.locator(hostSel).first().click({ timeout: 5000 });
  out.click2 = "ok";
} catch (err) {
  out.click2 = "fail: " + String(err).slice(0, 140);
}
await page.waitForTimeout(900);
out.steps.push({ step: "3-restored", ...(await snap()) });
await page.screenshot({ path: "p25-restored.png", clip: { x: 0, y: 0, width: 420, height: 120 } });

fs.writeFileSync("p25.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await browser.close();
