import { chromium } from "playwright-core";
const token = process.argv[2] || "PFsnc_raHaw-Kz1c5NN2P15fY3aD7zZhcB492R718t0";
const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto(`http://127.0.0.1:43129/?token=${token}`, { waitUntil: "networkidle" });
await p.waitForTimeout(2500);
const skip = p.getByText("跳过向导", { exact: false }).first();
if (await skip.count()) { try { await skip.click({ timeout: 2000 }); await p.waitForTimeout(800); } catch {} }
const out = await p.evaluate(() => {
  const sb = document.querySelector("[class*='_sidebarCol']");
  const cs = sb ? getComputedStyle(sb) : null;
  const fixed = [...document.querySelectorAll("*")].filter(e => getComputedStyle(e).position === "fixed")
    .map(e => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e);
      return { cls: (e.className||"").toString().slice(0,60), tag: e.tagName, x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), z: c.zIndex, bg: c.backgroundColor }; })
    .filter(o => o.w > 20 && o.h > 20 && o.w < 400 && o.h < 400);
  return { sidebarBg: cs?.backgroundColor, backdrop: cs?.backdropFilter, bodyBgImage: getComputedStyle(document.body).backgroundImage.slice(0,120), fixed };
});
console.log(JSON.stringify(out, null, 1));
await p.screenshot({ path: "p11-full.png" });
if (sbShown(out)) {}
function sbShown() { return false; }
await b.close();
