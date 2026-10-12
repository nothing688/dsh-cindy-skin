/**
 * probe28 — 列出「左上角」区域（x<560, y<240）内的可点元素，供确认用户所指的
 * 「新会话」按钮到底是哪一个（侧栏 _newSession 药丸 / 内容区头部 ⊕ 图标）。
 *
 *   $env:DSH_TOKEN = "<harness.log 末行 token>"
 *   node probe28.mjs
 */
import { chromium } from "playwright-core";

const token = process.env.DSH_TOKEN;
if (!token) {
  console.error("DSH_TOKEN is required");
  process.exit(1);
}

const W = Number(process.env.W || 1280);
const H = Number(process.env.H || 883);

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

const dumpTopLeft = () =>
  page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("button, a, [role='button'], [class*='_newSession'], [class*='newChat']")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      if (r.x > 560 || r.y > 240) continue;
      const cs = getComputedStyle(el);
      out.push({
        tag: el.tagName,
        cls: (el.className || "").toString().slice(0, 70),
        text: (el.textContent || "").trim().slice(0, 24),
        aria: el.getAttribute("aria-label"),
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        display: cs.display,
        bg: cs.backgroundColor,
      });
    }
    return out.sort((a, b) => a.rect.y - b.rect.y || a.rect.x - b.rect.x);
  });

const out = {};
out.expanded = await dumpTopLeft();
await page.screenshot({ path: "p28-expanded-topleft.png", clip: { x: 0, y: 0, width: 560, height: 240 } });

// 收起侧栏再看左上角
try {
  await page.locator("[class*='_sidebarCol'] [class*='_logoRow'] [class*='_toggle']").first().click({ timeout: 5000 });
  await page.waitForTimeout(900);
  out.collapsed = await dumpTopLeft();
  await page.screenshot({ path: "p28-collapsed-topleft.png", clip: { x: 0, y: 0, width: 560, height: 240 } });
} catch (err) {
  out.collapseError = String(err).slice(0, 140);
}

console.log(JSON.stringify(out, null, 2));
await browser.close();
