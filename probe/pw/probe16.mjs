import { chromium } from 'playwright-core';
import fs from 'node:fs';

const OUT = process.cwd();
const token = process.argv[2] || 'PFsnc_raHaw-Kz1c5NN2P15fY3aD7zZhcB492R718t0';

// 单元素体检：位置 / 可见性 / 指针命中链
const probeEl = (selector) => {
  const el = document.querySelector(selector);
  if (!el) return { selector, found: false };
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const cx = Math.round(r.x + r.width / 2);
  const cy = Math.round(r.y + r.height / 2);
  const hit = cx > 0 && cy > 0 ? document.elementFromPoint(cx, cy) : null;
  const chain = [];
  let cur = hit;
  while (cur && chain.length < 8) {
    chain.push((cur.className && cur.className.toString().slice(0, 70)) || cur.tagName);
    cur = cur.parentElement;
  }
  return {
    selector,
    found: true,
    rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
    opacity: cs.opacity,
    visibility: cs.visibility,
    display: cs.display,
    pointerEvents: cs.pointerEvents,
    overflow: cs.overflow,
    center: { cx, cy },
    hitIsSelfOrChild: hit ? el === hit || el.contains(hit) : false,
    hitChain: chain,
    isMine: el.classList.contains('cindy-nav-toggle'),
  };
};

// logoRow 及其子元素逐个测量
const rowLayoutJs = () => {
  const row = document.querySelector("[class*='_sidebarCol'] [class*='_logoRow']");
  const col = document.querySelector("[class*='_sidebarCol']");
  if (!row) return { row: null, colW: col ? Math.round(col.getBoundingClientRect().width) : null };
  const rr = row.getBoundingClientRect();
  return {
    colW: col ? Math.round(col.getBoundingClientRect().width) : null,
    railAttr: document.documentElement.getAttribute('data-cindy-rail'),
    row: { x: Math.round(rr.x), y: Math.round(rr.y), w: Math.round(rr.width), h: Math.round(rr.height) },
    rowStyle: {
      display: getComputedStyle(row).display,
      gap: getComputedStyle(row).gap,
      padding: getComputedStyle(row).padding,
      justifyContent: getComputedStyle(row).justifyContent,
    },
    children: Array.from(row.children).map((c) => {
      const r = c.getBoundingClientRect();
      const cs = getComputedStyle(c);
      return {
        tag: c.tagName,
        cls: c.className && c.className.toString().slice(0, 74),
        aria: c.getAttribute('aria-label'),
        text: (c.textContent || '').trim().slice(0, 24),
        rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        display: cs.display,
        opacity: cs.opacity,
        flex: cs.flex,
        minWidth: cs.minWidth,
      };
    }),
  };
};

// 品牌标签（HARNESS 徽标 / deepseek 字标）体检：判断「遮挡」来源
const brandJs = () => {
  const row = document.querySelector("[class*='_sidebarCol'] [class*='_logoRow']");
  if (!row) return null;
  const out = [];
  row.querySelectorAll('*').forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 4) return;
    const t = (el.textContent || '').trim();
    if (t.length > 30) return;
    out.push({
      tag: el.tagName,
      cls: el.className && el.className.toString().slice(0, 60),
      text: t.slice(0, 22),
      rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      right: Math.round(r.right),
    });
  });
  return out;
};

const out = { token, phases: [] };

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

try {
  await page.goto(`http://127.0.0.1:43129/?token=${token}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  const skip = page.getByText('跳过向导');
  if (await skip.count()) {
    await skip.first().click().catch(() => {});
    await page.waitForTimeout(1000);
  }

  // ---------- 展开态 ----------
  const expanded = { phase: 'expanded' };
  expanded.layout = await page.evaluate(rowLayoutJs);
  expanded.brand = await page.evaluate(brandJs);
  expanded.hostCollapseBtn = await page.evaluate(probeEl, "[aria-label*='收起侧边栏']");
  expanded.myToggle = await page.evaluate(probeEl, '.cindy-nav-toggle');
  out.phases.push(expanded);
  await page.screenshot({ path: `${OUT}/p16-expanded-top.png`, clip: { x: 0, y: 0, width: 300, height: 84 } });

  // ---------- 点宿主收起 → rail 态 ----------
  const collapseSel = "[aria-label*='收起侧边栏']";
  if (await page.locator(collapseSel).count()) {
    await page.locator(collapseSel).first().click();
    await page.waitForTimeout(1200);

    const rail = { phase: 'rail' };
    rail.layout = await page.evaluate(rowLayoutJs);
    rail.brand = await page.evaluate(brandJs);
    rail.hostReopenBtn = await page.evaluate(probeEl, "[aria-label*='打开侧边栏']");
    rail.anyToggleish = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll("[class*='_iconButton'], button, [role='button']").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) return;
        const inSidebar = !!el.closest("[class*='_sidebarCol']");
        if (!inSidebar) return;
        out.push({
          cls: el.className && el.className.toString().slice(0, 60),
          aria: el.getAttribute('aria-label'),
          title: el.getAttribute('title'),
          rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
        });
      });
      return out;
    });
    out.phases.push(rail);
    await page.screenshot({ path: `${OUT}/p16-rail-top.png`, clip: { x: 0, y: 0, width: 300, height: 84 } });
    await page.screenshot({ path: `${OUT}/p16-rail-full.png` });
  }
} catch (e) {
  out.error = String(e && e.message ? e.message : e);
}

fs.writeFileSync(`${OUT}/p16.json`, JSON.stringify(out, null, 2));
console.log('WROTE p16.json');
console.log(JSON.stringify(out.phases.map((p) => ({ phase: p.phase, colW: p.layout && p.layout.colW, railAttr: p.layout && p.layout.railAttr })), null, 2));
await browser.close();
