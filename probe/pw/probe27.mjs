/**
 * probe27 — 参照组：在同一环境里**关掉本插件的全部样式与注入节点**，测「默认主题」下
 * 宿主「收起/打开侧边栏」按钮的行为，作为对齐目标。
 *
 * 做法：加载后 setAttribute data-windows-titlebar + --dsh-windows-titlebar-height:40px
 *       （复现宿主 preload：out/preload/index.cjs:381 / :231），
 *       再 remove 所有 style[data-plugin="dsh-cindy-skin"] 与 .cindy-nav-toggle，
 *       清除 html 上的 data-cindy-* 属性 → 近似默认主题。
 *
 * 用法：$env:DSH_TOKEN=... ; node probe27.mjs
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

await page.evaluate(() => {
  document.documentElement.setAttribute("data-windows-titlebar", "");
  document.documentElement.style.setProperty("--dsh-windows-titlebar-height", "40px");
});
await page.waitForTimeout(400);

// ★ 关掉本插件 → 参照组
const removed = await page.evaluate(() => {
  const styles = Array.from(document.querySelectorAll("style[data-plugin='dsh-cindy-skin']"));
  styles.forEach((s) => s.remove());
  const btn = document.querySelector(".cindy-nav-toggle");
  if (btn) btn.remove();
  const floatBtn = document.querySelector(".cindy-nav-rail-float");
  if (floatBtn) floatBtn.remove();
  document.documentElement.removeAttribute("data-cindy-rail");
  document.documentElement.removeAttribute("data-cindy-nav-collapsed");
  return { styleTagsRemoved: styles.length };
});
await page.waitForTimeout(400);

const snap = () =>
  page.evaluate(() => {
    const pick = (s) => document.querySelector(s);
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
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        hitIsSelf: !!(hitEl && (hitEl === el || el.contains(hitEl))),
        hitTag: hitEl ? hitEl.tagName + "." + (hitEl.className || "").toString().slice(0, 44) : null,
      };
    };
    const col = pick("[class*='_sidebarCol']");
    return {
      colW: col ? Math.round(col.getBoundingClientRect().width) : null,
      colDisplay: col ? getComputedStyle(col).display : null,
      hostToggle: info(
        pick("[class*='_iconButton'][class*='_toggle']") || pick("[class*='_logoRow'] [class*='_toggle']"),
      ),
    };
  });

const hostSel = "[class*='_iconButton'][class*='_toggle']";
const out = { removed, steps: [] };

out.steps.push({ step: "1-expanded(default)", ...(await snap()) });
await page.screenshot({ path: "p27-expanded.png", clip: { x: 0, y: 0, width: 420, height: 120 } });

try {
  await page.locator(hostSel).first().click({ timeout: 5000 });
  out.click1 = "ok";
} catch (err) {
  out.click1 = "fail: " + String(err).slice(0, 140);
}
await page.waitForTimeout(1200);
out.steps.push({ step: "2-collapsed(default)", ...(await snap()) });
await page.screenshot({ path: "p27-collapsed.png", clip: { x: 0, y: 0, width: 420, height: 120 } });

// 用坐标强点一次（绕开可操作性检查），看是否真能恢复
try {
  await page.mouse.click(26, 60);
  out.forceClick = "ok";
} catch (err) {
  out.forceClick = "fail: " + String(err).slice(0, 140);
}
await page.waitForTimeout(1200);
out.steps.push({ step: "3-after-force-click(default)", ...(await snap()) });
await page.screenshot({ path: "p27-restored.png", clip: { x: 0, y: 0, width: 420, height: 120 } });

fs.writeFileSync("p27.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await browser.close();
