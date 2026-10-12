import { chromium } from 'playwright-core';
import fs from 'node:fs';

const OUT = process.cwd();
const token = process.argv[2] || 'PFsnc_raHaw-Kz1c5NN2P15fY3aD7zZhcB492R718t0';

// 自包含快照函数（不引用外部变量）
const snapJs = () => {
  const rect = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
  };
  const cls = (el) => (el && el.className ? el.className.toString().slice(0, 100) : null);
  const row = document.querySelector("[class*='_sidebarCol'] [class*='_logoRow']");
  const col = document.querySelector("[class*='_sidebarCol']");
  const mine = document.querySelector('.cindy-nav-toggle');
  const visible = (el) => {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  let ls = 'ERR';
  try { ls = localStorage.getItem('dsh-cindy-skin:nav-collapsed'); } catch (e) { /* ignore */ }
  return {
    railAttr: document.documentElement.getAttribute('data-cindy-rail'),
    navCollapsedAttr: document.documentElement.hasAttribute('data-cindy-nav-collapsed'),
    lsNavCollapsed: ls,
    sidebarColW: col ? Math.round(col.getBoundingClientRect().width) : null,
    myBtn: rect(mine),
    myBtnVisible: visible(mine),
    myBtnDisplay: mine ? getComputedStyle(mine).display : null,
    logoRow: rect(row),
    logoRowOrder: row
      ? Array.from(row.children).map((c) =>
          c.classList.contains('cindy-nav-toggle')
            ? 'MINE'
            : c.getAttribute('aria-label') || c.getAttribute('title') || cls(c) || c.tagName)
      : null,
    topButtons: Array.from(document.querySelectorAll("[class*='_iconButton'], .cindy-nav-toggle")).map((el) => ({
      cls: cls(el),
      aria: el.getAttribute('aria-label'),
      isMine: el.classList.contains('cindy-nav-toggle'),
      rect: rect(el),
      visible: visible(el),
      inLogoRow: row ? row.contains(el) : false,
    })),
  };
};

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const out = { token, steps: [] };

const TOP_CLIP = { x: 0, y: 0, width: 300, height: 84 };

try {
  await page.goto(`http://127.0.0.1:43129/?token=${token}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  const skip = page.getByText('跳过向导');
  if (await skip.count()) {
    await skip.first().click().catch(() => {});
    await page.waitForTimeout(1000);
  }

  // --- 展开态 ---
  out.steps.push({ step: '0-展开态', ...(await page.evaluate(snapJs)) });
  await page.screenshot({ path: `${OUT}/p15-expanded-top.png`, clip: TOP_CLIP });
  await page.screenshot({ path: `${OUT}/p15-expanded-full.png` });

  // --- 点宿主「收起侧边栏」→ rail 态 ---
  const nativeSel = "[aria-label*='收起侧边栏']";
  out.nativeCount = await page.locator(nativeSel).count();
  if (out.nativeCount) {
    await page.locator(nativeSel).first().click();
    await page.waitForTimeout(1200);
    out.steps.push({ step: '1-rail态', ...(await page.evaluate(snapJs)) });
    await page.screenshot({ path: `${OUT}/p15-rail-top.png`, clip: TOP_CLIP });
    await page.screenshot({ path: `${OUT}/p15-rail-full.png` });

    // --- 再展开，确认可逆 ---
    const reopen = page.locator("[aria-label*='打开侧边栏']");
    out.reopenCount = await reopen.count();
    if (out.reopenCount) {
      await reopen.first().click();
      await page.waitForTimeout(1000);
      out.steps.push({ step: '2-再展开', ...(await page.evaluate(snapJs)) });
      await page.screenshot({ path: `${OUT}/p15-re-expanded-top.png`, clip: TOP_CLIP });
    }
  }
} catch (e) {
  out.error = String(e && e.message ? e.message : e);
}

fs.writeFileSync(`${OUT}/p15.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await browser.close();
