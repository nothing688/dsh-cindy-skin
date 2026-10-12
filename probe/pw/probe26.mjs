/**
 * probe26 — 追查 --dsh-windows-titlebar-height 在展开/收起两态下的取值与来源。
 * 现象（probe25）：展开态宿主 fixed 按钮 top=12px 可见可点；收起后 top 变成 -14px，按钮跑到视口外。
 * 用法：$env:DSH_TOKEN=... ; node probe26.mjs
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
await page.evaluate(() => document.documentElement.setAttribute("data-windows-titlebar", ""));
await page.waitForTimeout(500);

const snap = () =>
  page.evaluate(() => {
    const v = (el) => (el ? getComputedStyle(el).getPropertyValue("--dsh-windows-titlebar-height").trim() : null);
    const host = document.querySelector("[class*='_iconButton'][class*='_toggle']");
    const row = document.querySelector("[class*='_sidebarCol'] [class*='_logoRow']");
    const col = document.querySelector("[class*='_sidebarCol']");
    const frame = document.querySelector("[class*='_frame']");
    return {
      html: v(document.documentElement),
      body: v(document.body),
      frame: v(frame),
      col: v(col),
      row: v(row),
      hostToggle: v(host),
      // 哪些元素带内联 style 且含该变量
      inlineDefs: Array.from(document.querySelectorAll("[style]"))
        .filter((el) => (el.getAttribute("style") || "").includes("dsh-windows-titlebar-height"))
        .slice(0, 6)
        .map((el) => ({
          tag: el.tagName,
          cls: (el.className || "").toString().slice(0, 50),
          style: (el.getAttribute("style") || "").slice(0, 200),
        })),
      htmlInline: (document.documentElement.getAttribute("style") || "").slice(0, 200),
      bodyInline: (document.body.getAttribute("style") || "").slice(0, 200),
      colW: col ? Math.round(col.getBoundingClientRect().width) : null,
      railAttr: document.documentElement.getAttribute("data-cindy-rail"),
      hostRect: (() => {
        if (!host) return null;
        const r = host.getBoundingClientRect();
        const cs = getComputedStyle(host);
        return {
          x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height),
          cssTop: cs.top, cssLeft: cs.left, pos: cs.position,
        };
      })(),
    };
  });

const out = { steps: [] };
out.steps.push({ step: "1-expanded", ...(await snap()) });

try {
  await page.locator("[class*='_iconButton'][class*='_toggle']").first().click({ timeout: 5000 });
  out.click = "ok";
} catch (err) {
  out.click = "fail: " + String(err).slice(0, 140);
}
await page.waitForTimeout(900);
out.steps.push({ step: "2-collapsed", ...(await snap()) });

fs.writeFileSync("p26.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await browser.close();
