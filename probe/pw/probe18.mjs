/**
 * probe18 — 取证：页面实际加载的是哪一版插件代码？logoRow 真实结构是什么？
 * 解决「我的探针结果与用户截图不一致」的分歧。
 */
import { chromium } from "playwright-core";
import fs from "node:fs";

const token = process.env.DSH_TOKEN;
if (!token) throw new Error("DSH_TOKEN env missing");
const W = Number(process.env.PW || 1280);
const H = Number(process.env.PH || 800);

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto(`http://127.0.0.1:43129/?token=${token}`, { waitUntil: "networkidle" });
await page.waitForTimeout(2500);

const skip = page.getByText("跳过向导", { exact: false });
if (await skip.count()) {
  await skip.first().click().catch(() => {});
  await page.waitForTimeout(1200);
}

const info = await page.evaluate(() => {
  // 1) 找出插件注入的 style 标签，看是不是新版代码
  const styles = Array.from(document.querySelectorAll("style"))
    .map((s) => ({ id: s.id || null, len: (s.textContent || "").length, head: (s.textContent || "").slice(0, 240) }))
    .filter((s) => (s.head || "").includes("cindy") || (s.head || "").includes("nav-toggle") || (s.id || "").includes("cindy"));

  const navStyle = Array.from(document.querySelectorAll("style")).find((s) =>
    (s.textContent || "").includes("cindy-nav-toggle"),
  );
  const navCss = navStyle ? navStyle.textContent : null;
  const markers = {
    hasRailHideHostToggle: navCss ? navCss.includes("data-cindy-rail] [class*='_sidebarCol']") : null,
    hasMarginAuto: navCss ? navCss.includes("margin: 0 auto") : null,
    hasOpacity72: navCss ? navCss.includes("opacity: .72") : null,
    hasBrandShrink: navCss ? navCss.includes("min-width: 0") : null,
  };

  // 2) 注入脚本是否含 rail 分支（新版 client.js 独有）
  const scripts = Array.from(document.querySelectorAll("script"))
    .map((s) => s.textContent || "")
    .filter((t) => t.includes("cindy-nav-toggle"));
  const codeHasHostClick = scripts.some((t) => t.includes("host.click()"));

  // 3) logoRow 真实结构
  const row = document.querySelector("[class*='_sidebarCol'] [class*='_logoRow']");
  const col = document.querySelector("[class*='_sidebarCol']");
  const rows = Array.from(document.querySelectorAll("[class*='_logoRow']")).map((r) => ({
    cls: r.className,
    inSidebar: !!r.closest("[class*='_sidebarCol']"),
    w: Math.round(r.getBoundingClientRect().width),
  }));

  const dump = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName,
      cls: (el.className || "").toString().slice(0, 60),
      aria: el.getAttribute("aria-label"),
      text: (el.textContent || "").trim().slice(0, 24),
      x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
      display: cs.display, opacity: cs.opacity,
    };
  };

  return {
    viewport: { w: innerWidth, h: innerHeight },
    colW: col ? Math.round(col.getBoundingClientRect().width) : null,
    railAttr: document.documentElement.getAttribute("data-cindy-rail"),
    injectedStyles: styles,
    markers,
    codeHasHostClick,
    scriptCount: scripts.length,
    rowFound: !!row,
    rowCls: row ? row.className : null,
    rowChildren: row ? Array.from(row.children).map(dump) : null,
    rowAllButtons: row ? Array.from(row.querySelectorAll("button, [role='button'], [class*='_iconButton']")).map(dump) : null,
    rowsFound: rows,
    clientJsUrlLoaded: Array.from(document.querySelectorAll("script")).some((s) => (s.src || "").includes("dsh-cindy-skin")),
    perfEntries: performance
      .getEntriesByType("resource")
      .map((e) => e.name)
      .filter((n) => n.includes("cindy"))
      .slice(0, 6),
  };
});

fs.writeFileSync(`p18-${W}x${H}.json`, JSON.stringify(info, null, 2));
console.log(JSON.stringify(info, null, 1));
await page.screenshot({ path: `p18-${W}x${H}-full.png` });
await browser.close();
