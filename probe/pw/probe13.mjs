import { chromium } from "playwright-core";
const token = process.argv[2] || "PFsnc_raHaw-Kz1c5NN2P15fY3aD7zZhcB492R718t0";
const b = await chromium.launch({ channel: "msedge", headless: true });
const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
await p.goto(`http://127.0.0.1:43129/?token=${token}`, { waitUntil: "networkidle" });
await p.waitForTimeout(2500);
const skip = p.getByText("跳过向导", { exact: false }).first();
if (await skip.count()) { try { await skip.click({ timeout: 2000 }); await p.waitForTimeout(900); } catch {} }
await p.screenshot({ path: "p12-full.png" });
const sb = await p.$("[class*='_sidebarCol']");
if (sb) await sb.screenshot({ path: "p12-sidebar.png" });
console.log("shots written");
await b.close();
