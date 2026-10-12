// probe10: 侧栏按钮坐标实测 + 玻璃层现状采样
import { chromium } from "playwright-core";

const TOKEN = process.argv[2] || "PFsnc_raHaw-Kz1c5NN2P15fY3aD7zZhcB492R718t0";
const URL = `http://127.0.0.1:43129/?token=${TOKEN}`;
const OUT = process.cwd();

const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
page.on("console", (m) => {
  const t = m.text();
  if (t.includes("cindy") || t.includes("Cindy")) console.log("[console]", t);
});

await page.goto(URL, { waitUntil: "load" });
await page.waitForTimeout(2500);

// 关掉可能的欢迎向导
try {
  const skip = page.locator("text=跳过向导");
  if (await skip.count()) {
    await skip.first().click();
    console.log("[setup] 跳过向导");
    await page.waitForTimeout(800);
  }
} catch {}

const data = await page.evaluate(() => {
  const sidebar = document.querySelector("[class*='_sidebarCol']");
  if (!sidebar) return { error: "no sidebar found" };
  const sb = sidebar.getBoundingClientRect();
  const cs = getComputedStyle(sidebar);
  const items = [];
  sidebar.querySelectorAll("button, [role='button'], a").forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;
    items.push({
      cls: String(el.className || "").slice(0, 64),
      title: el.getAttribute("title") || "",
      aria: el.getAttribute("aria-label") || "",
      x: Math.round(r.x - sb.x),
      y: Math.round(r.y - sb.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      right: Math.round(sb.right - r.right),
    });
  });
  // 面包屑式补采：侧栏内所有含 svg 的元素（图标按钮可能不是 button）
  const iconHosts = [];
  sidebar.querySelectorAll("svg").forEach((s) => {
    const host = s.closest("button,[role='button'],a") || s.parentElement;
    if (!host) return;
    const r = host.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return;
    iconHosts.push({
      tag: host.tagName.toLowerCase(),
      cls: String(host.className || "").slice(0, 64),
      title: host.getAttribute("title") || "",
      x: Math.round(r.x - sb.x),
      y: Math.round(r.y - sb.y),
      w: Math.round(r.width),
      h: Math.round(r.height),
      right: Math.round(sb.right - r.right),
    });
  });
  return {
    sidebar: {
      x: Math.round(sb.x),
      y: Math.round(sb.y),
      w: Math.round(sb.width),
      h: Math.round(sb.height),
      bg: cs.backgroundColor,
      bgImage: cs.backgroundImage.slice(0, 120),
      backdrop: cs.backdropFilter,
      borderRight: cs.borderRightColor + " " + cs.borderRightWidth,
    },
    bodyBg: getComputedStyle(document.body).backgroundColor,
    bodyBgImage: getComputedStyle(document.body).backgroundImage.slice(0, 120),
    htmlBg: getComputedStyle(document.documentElement).backgroundColor,
    contentAreaBg: (() => {
      const m = document.querySelector("main");
      return m ? getComputedStyle(m).backgroundColor : "no main";
    })(),
    items,
    iconHosts,
  };
});

console.log(JSON.stringify(data, null, 2));

await page.screenshot({ path: `${OUT}/p10-full.png` });
const sb = data.sidebar;
if (sb && sb.w) {
  await page.screenshot({
    path: `${OUT}/p10-sidebar.png`,
    clip: { x: sb.x, y: sb.y, width: sb.w, height: Math.min(sb.h, 800) },
  });
}
await browser.close();
console.log("[done]");
