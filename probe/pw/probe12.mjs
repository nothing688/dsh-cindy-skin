import { chromium } from "playwright-core";
const token = process.argv[2] || "PFsnc_raHaw-Kz1c5NN2P15fY3aD7zZhcB492R718t0";
const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto(`http://127.0.0.1:43129/?token=${token}`, { waitUntil: "networkidle" });
await p.waitForTimeout(2500);
const skip = p.getByText("跳过向导", { exact: false }).first();
if (await skip.count()) { try { await skip.click({ timeout: 2000 }); await p.waitForTimeout(800); } catch {} }
const out = await p.evaluate(() => {
  const chain = [];
  let el = document.querySelector("[class*='_sidebarCol']");
  let n = 0;
  while (el && n < 12) {
    const c = getComputedStyle(el);
    chain.push({ tag: el.tagName, cls: (el.className||"").toString().slice(0,44), bg: c.backgroundColor, bgImg: c.backgroundImage === "none" ? "none" : c.backgroundImage.slice(0,70) });
    el = el.parentElement; n++;
  }
  // 侧栏左缘中点，沿途 elementFromPoint 逐层
  const stack = document.elementsFromPoint(140, 400).map(e => {
    const c = getComputedStyle(e);
    return { tag: e.tagName, cls: (e.className||"").toString().slice(0,44), bg: c.backgroundColor, bgImg: c.backgroundImage === "none" ? "none" : "IMG" };
  });
  return { chain, stack };
});
console.log(JSON.stringify(out, null, 1));
await b.close();
