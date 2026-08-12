// End-to-end checks against the real page in a real browser.
//
// These are not decoration. Every serious bug in this project so far was found
// here and would have passed a code read: an invisible modal covering the screen
// and swallowing every tap, already-earned animals being re-announced on every
// page load, and the tab bar dropping out of the viewport after a CSS rule
// restated `position` on it.
//
//   npm install          # playwright is a devDependency
//   npx playwright install chromium
//   npm run test:browser
//
// Set CHROME_PATH to use a browser Playwright did not install.

import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { chromium } from 'playwright';
import { serve } from './server.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const PHONE = { width: 390, height: 844 };

let browser, http, base;

before(async () => {
  ({ server: http, url: base } = await serve(ROOT));
  browser = await chromium.launch(
    process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {},
  );
});

after(async () => {
  await browser?.close();
  http?.close();
});

const dayKey = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** Opens the page with `days` already in localStorage, so it starts hydrated. */
async function open(days = {}, options = {}) {
  const page = await browser.newPage({ viewport: PHONE, ...options });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.errors = errors;

  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.evaluate((seed) => {
    localStorage.setItem('snack-tracker-days', JSON.stringify(seed));
  }, days);
  await page.reload({ waitUntil: 'domcontentloaded' });
  // Firestore is unreachable in CI, so the store falls back to localStorage.
  await page.waitForFunction(() => document.querySelectorAll('.player').length === 2);
  await page.waitForTimeout(1200);
  return page;
}

const readStore = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('snack-tracker-days') || '{}'));

test('a plain page load celebrates nothing', async () => {
  // A history that has already earned animals must not replay them on load.
  const page = await open({
    [dayKey(3)]: { george: 'green' },
    [dayKey(2)]: { george: 'green' },
    [dayKey(1)]: { george: 'green' },
  });
  assert.equal(await page.locator('#fx svg').count(), 0);
  assert.equal(await page.locator('.toast').count(), 0);
  assert.equal(await page.locator('.banner').count(), 0);
  await page.close();
});

test('today\'s rating shows as selected', async () => {
  const page = await open({ [dayKey(0)]: { george: 'yellow' } });
  const pressed = await page
    .locator('.choice[data-player="george"][aria-pressed="true"]')
    .getAttribute('data-r');
  assert.equal(pressed, 'yellow');
  await page.close();
});

test('a rating persists and a red summons the boss', async () => {
  const page = await open();
  await page.click('.choice[data-player="izzy"][data-r="red"]');
  await page.waitForTimeout(400);

  assert.match(await page.locator('.toast').first().textContent(), /HIPPO/);
  assert.ok(await page.evaluate(() => document.body.classList.contains('shake')));
  assert.equal((await readStore(page))[dayKey(0)].izzy, 'red');
  await page.close();
});

test('the calendar backfills a recent day and locks older ones', async () => {
  const page = await open();
  await page.click('.tab[data-view="calendar"]');
  await page.waitForTimeout(300);

  await page.click(`[data-open="${dayKey(2)}"]`);
  assert.equal(await page.locator('#editor').isVisible(), true);
  assert.equal(await page.locator('#editorTitle').textContent(), dayKey(2));

  await page.click('#editorBody .choice[data-player="george"][data-r="yellow"]');
  await page.waitForTimeout(400);
  assert.equal((await readStore(page))[dayKey(2)].george, 'yellow');

  assert.equal(await page.locator(`[data-open="${dayKey(5)}"]`).count(), 0,
    'a day past the backfill window must not be editable');
  await page.close();
});

test('the konami code releases the whale', async () => {
  const page = await open();
  for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft',
    'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) {
    await page.keyboard.press(k);
  }
  await page.waitForTimeout(300);
  assert.ok(await page.locator('#fx svg[aria-label="BLUE WHALE"]').count() > 0);
  await page.close();
});

test('the tab bar stays pinned to the bottom of the viewport', async () => {
  // Regression: a later rule restated `position` on .tabs, overriding
  // `position: fixed` and dropping it into the page flow mid-screen.
  const page = await open();
  const tabs = await page.evaluate(() => {
    const el = document.querySelector('.tabs');
    return {
      position: getComputedStyle(el).position,
      bottom: el.getBoundingClientRect().bottom,
      viewport: window.innerHeight,
    };
  });
  assert.equal(tabs.position, 'fixed');
  assert.ok(Math.abs(tabs.bottom - tabs.viewport) < 2,
    `expected the tab bar at the viewport bottom, got ${tabs.bottom} of ${tabs.viewport}`);
  await page.close();
});

test('nothing overflows sideways on a phone', async () => {
  const page = await open({ [dayKey(1)]: { george: 'green', izzy: 'red' } });
  for (const view of ['today', 'calendar', 'scores']) {
    await page.click(`.tab[data-view="${view}"]`);
    await page.waitForTimeout(250);
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(overflows, false, `${view} scrolls sideways`);
  }
  await page.close();
});

test('reaching a milestone unlocks an animal, with points rolling up', async () => {
  const page = await open({
    [dayKey(2)]: { george: 'green' },
    [dayKey(1)]: { george: 'green' },
  });
  await page.click('.choice[data-player="george"][data-r="green"]');

  const distinct = await page.evaluate(async () => {
    const seen = new Set();
    for (let i = 0; i < 30; i++) {
      seen.add(document.querySelector('[data-points="george"]').textContent);
      await new Promise((r) => requestAnimationFrame(r));
    }
    return seen.size;
  });
  assert.ok(distinct > 3, `points should roll up, saw ${distinct} values`);

  await page.waitForTimeout(400);
  const banner = await page.locator('.banner').first().textContent();
  assert.match(banner, /A WILD \w+ APPEARS!/);
  assert.ok(await page.locator('#fx svg.reveal').count() > 0);
  await page.close();
});

test('a green throws confetti', async () => {
  const page = await open();
  await page.click('.choice[data-player="george"][data-r="green"]');
  assert.ok(await page.locator('.particle').count() > 0);
  await page.close();
});

test('the starfield renders and can never intercept a tap', async () => {
  const page = await open();
  assert.ok(await page.locator('.star').count() > 20);
  assert.equal(
    await page.evaluate(() => getComputedStyle(document.querySelector('.stars')).pointerEvents),
    'none');
  await page.close();
});

test('reduced motion suppresses the decoration', async () => {
  const page = await open({}, { reducedMotion: 'reduce' });
  assert.equal(await page.locator('.star').count(), 0);
  await page.close();
});

test('no page threw an error', async () => {
  const page = await open({ [dayKey(1)]: { george: 'green', izzy: 'yellow' } });
  await page.click('.tab[data-view="scores"]');
  await page.waitForTimeout(400);
  assert.deepEqual(page.errors, []);
  await page.close();
});
