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
  const pl = document.querySelector("[class*='_panelList']");
  const iconButtons = Array.from(document.querySelectorAll("[class*='_iconButton']")).map((el) => ({
    cls: cls(el),
    aria: el.getAttribute('aria-label'),
    title: el.getAttribute('title'),
    rect: rect(el),
    inLogoRow: row ? row.contains(el) : false,
  }));
  let ls = 'ERR';
  try { ls = localStorage.getItem('dsh-cindy-skin:nav-collapsed'); } catch (e) { /* ignore */ }
  return {
    navCollapsedAttr: document.documentElement.hasAttribute('data-cindy-nav-collapsed'),
    lsNavCollapsed: ls,
    myBtn: rect(document.querySelector('.cindy-nav-toggle')),
    myBtnExists: !!document.querySelector('.cindy-nav-toggle'),
    sidebarColW: col ? Math.round(col.getBoundingClientRect().width) : null,
    panelListH: pl ? Math.round(pl.getBoundingClientRect().height) : null,
    logoRow: rect(row),
    logoRowOrder: row
      ? Array.from(row.children).map((c) =>
          c.classList.contains('cindy-nav-toggle')
            ? 'MINE'
            : c.getAttribute('aria-label') || c.getAttribute('title') || cls(c) || c.tagName)
      : null,
    iconButtons,
    bodyFontFamilyVar: getComputedStyle(document.body).getPropertyValue('--dsw-font-family').slice(0, 70),
  };
};

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const out = { token, steps: [] };

try {
  await page.goto(`http://127.0.0.1:43129/?token=${token}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3500);

  const skip = page.getByText('跳过向导');
  if (await skip.count()) {
    await skip.first().click().catch(() => {});
    await page.waitForTimeout(1000);
  }

  out.steps.push({ step: '0-初始', ...(await page.evaluate(snapJs)) });

  const nativeSel = "[aria-label*='收起侧边栏']";
  out.nativeCount = await page.locator(nativeSel).count();
  if (out.nativeCount) {
    await page.locator(nativeSel).first().click();
    await page.waitForTimeout(1000);
    out.steps.push({ step: '1-点原生收起', ...(await page.evaluate(snapJs)) });

    out.nativeCountAfter = await page.locator(nativeSel).count();
    if (out.nativeCountAfter) {
      await page.locator(nativeSel).first().click();
      await page.waitForTimeout(1000);
      out.steps.push({ step: '2-再点原生展开', ...(await page.evaluate(snapJs)) });
    }
  }

  const mine = page.locator('.cindy-nav-toggle');
  out.myCount = await mine.count();
  if (out.myCount) {
    await mine.first().click();
    await page.waitForTimeout(800);
    out.steps.push({ step: '3-点我的折叠', ...(await page.evaluate(snapJs)) });
  }

  await page.screenshot({ path: `${OUT}/p14-full.png` });
} catch (e) {
  out.error = String(e && e.message ? e.message : e);
}

fs.writeFileSync(`${OUT}/p14.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await browser.close();
