import { chromium } from "playwright-core";

const TOKEN = process.env.DSH_TOKEN;
const W = +(process.env.W || 1280), H = +(process.env.H || 883);
const URL = `http://127.0.0.1:43129/?token=${TOKEN}`;

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.goto(URL, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(4000);

// close the dsh-auto-memory welcome wizard if present
for (const t of ["跳过向导", "跳过"]) {
  const b = page.locator(`text=${t}`).first();
  if (await b.count()) { try { await b.click({ timeout: 2500 }); break; } catch {} }
}
await page.waitForTimeout(1000);

// simulate the real Windows titlebar environment
await page.evaluate(() => document.documentElement.setAttribute("data-windows-titlebar", ""));
await page.waitForTimeout(600);

const snap = (label) => page.evaluate((label) => {
  const col = document.querySelector("[class*='_sidebarCol']");
  const row = document.querySelector("[class*='_sidebarCol'] [class*='_logoRow']");
  const mine = document.querySelector(".cindy-nav-toggle");
  const host = document.querySelector("[class*='_sidebarCol'] [class*='_logoRow'] [class*='_toggle']");
  const rounded = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
  const vis = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
    return {
      display: cs.display, visibility: cs.visibility, opacity: cs.opacity,
      position: cs.position, zIndex: cs.zIndex, rect: rounded(el),
      hitSelf: !!(hit && (hit === el || el.contains(hit))),
    };
  };
  return {
    label,
    colW: col ? Math.round(col.getBoundingClientRect().width) : null,
    railAttr: document.documentElement.getAttribute("data-cindy-rail"),
    rowRect: row ? rounded(row) : null,
    mine: vis(mine),
    host: vis(host),
    rowOrder: row ? [...row.children].map((c) => `${c.getAttribute("aria-label") || String(c.className).split(" ")[0]}@${Math.round(c.getBoundingClientRect().x)}`) : null,
    mineInDom: !!mine,
  };
}, label);

const out = {};
const clip = { x: 0, y: 0, width: Math.min(360, W), height: 100 };

out.expanded = await snap("expanded");
await page.screenshot({ path: "p22-expanded.png", clip });

const hostBtn = page.locator("[class*='_sidebarCol'] [class*='_logoRow'] [class*='_toggle']").first();
try { await hostBtn.click({ timeout: 5000 }); } catch (e) { out.hostClickError = String(e).slice(0, 200); }
await page.waitForTimeout(1500);
out.rail = await snap("rail");
await page.screenshot({ path: "p22-rail.png", clip });
await page.screenshot({ path: "p22-rail-full.png" });

const mineBtn = page.locator(".cindy-nav-toggle").first();
try { await mineBtn.click({ timeout: 5000 }); } catch (e) { out.mineClickError = String(e).slice(0, 200); }
await page.waitForTimeout(1500);
out.recovered = await snap("recovered");
await page.screenshot({ path: "p22-recovered.png", clip });

console.log(JSON.stringify(out, null, 2));
await browser.close();
