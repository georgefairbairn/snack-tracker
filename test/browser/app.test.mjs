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

/**
 * The Day `offset` days before the one the app considers today. A Day runs 4am
 * to 4am (js/dates.js), so between midnight and 4am the app's today is still
 * yesterday's date — without that shift every test seeding "today" seeds a Day
 * the app has not reached, and the whole suite fails for four hours a night.
 */
const dayKey = (offset) => {
  const d = new Date();
  d.setHours(d.getHours() - 4);
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

/**
 * Presses the reveal card away. Every rating tap raises one and it covers the
 * screen until dismissed, so a test that taps a rating and then touches
 * anything else has to clear it first.
 */
async function dismissReveal(page) {
  await page.locator('.reveal-card').first().waitFor({ state: 'visible' });
  await page.click('.reveal-card');
  await page.waitForFunction(() => !document.querySelector('.reveal-card'));
}

/**
 * Waits for a banner matching `pattern`. Banners queue rather than stack — one
 * tap can raise a bonus run, an animal and a co-op bonus — so a test must not
 * assume which one is on screen first.
 */
async function waitForBanner(page, pattern, timeout = 9000) {
  const seen = new Set();
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    for (const text of await page.locator('.banner').allTextContents()) seen.add(text);
    for (const text of seen) if (pattern.test(text)) return text;
    await page.waitForTimeout(100);
  }
  throw new Error(`no banner matched ${pattern}; saw ${JSON.stringify([...seen])}`);
}

const mondayIndex = (offset) => (new Date(dayKey(offset).replace(/-/g, '/')).getDay() + 6) % 7;

/**
 * The most recent day that is still editable and has its two preceding days in
 * the same Mon-Sun week — the only place a three-day Bonus Run can be completed
 * by hand. Which of the three it is depends on what day the suite runs.
 */
function bonusRunDay() {
  const offset = [0, 1, 2].find((n) => mondayIndex(n) >= 2);
  return { offset, key: dayKey(offset), today: offset === 0 };
}

test('a plain page load celebrates nothing', async () => {
  // A history that has already earned animals must not replay them on load.
  const page = await open({
    [dayKey(3)]: { george: 'green' },
    [dayKey(2)]: { george: 'green' },
    [dayKey(1)]: { george: 'green' },
  });
  assert.equal(await page.locator('#fx svg').count(), 0);
  assert.equal(await page.locator('.reveal-card').count(), 0);
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

  assert.match(await page.locator('.reveal-card').textContent(), /HIPPO/);
  assert.ok(await page.locator('.reveal-card svg[aria-label="HIPPO"]').count() > 0);
  assert.ok(await page.evaluate(() => document.body.classList.contains('shake')));
  assert.equal((await readStore(page))[dayKey(0)].izzy, 'red');
  await page.close();
});

test('the hippo shows on every red and joins no collection', async () => {
  // Red always brings the same animal — it is the one that means you did badly,
  // so it has to be recognisable on sight rather than drawn.
  const page = await open({
    [dayKey(2)]: { george: 'green' },
    [dayKey(1)]: { george: 'green' },
  });
  for (let i = 0; i < 2; i++) {
    await page.click('.choice[data-player="george"][data-r="red"]');
    assert.ok(await page.locator('.reveal-card svg[aria-label="HIPPO"]').count() > 0,
      `the hippo should turn up on red every time, missing on press ${i + 1}`);
    await dismissReveal(page);
  }

  await page.click('.tab[data-view="scores"]');
  await page.waitForTimeout(300);
  assert.equal(await page.locator('.collection svg[aria-label="HIPPO"]').count(), 0,
    'the hippo must never join a collection');
  await page.close();
});

test('every rating raises an animal that waits to be pressed away', async () => {
  const page = await open();
  for (const rating of ['green', 'yellow', 'red']) {
    await page.click(`.choice[data-player="george"][data-r="${rating}"]`);
    const card = page.locator('.reveal-card');
    await card.waitFor({ state: 'visible' });
    assert.ok(await card.locator('svg').count() > 0, `${rating} should show an animal`);

    // It has to still be there well after every timed effect would have expired.
    await page.waitForTimeout(2500);
    assert.equal(await card.count(), 1, `${rating}'s animal should wait to be dismissed`);
    await dismissReveal(page);
  }
  await page.close();
});

test('the card says how many more greens the next animal needs', async () => {
  // Two green days in, the first animal lands at three.
  const page = await open({
    [dayKey(2)]: { george: 'green' },
    [dayKey(1)]: { george: 'green' },
  });
  await page.click('.choice[data-player="george"][data-r="yellow"]');
  assert.match(await page.locator('.reveal-chase').textContent(),
    /1 MORE GREEN TO GEORGE'S NEXT ANIMAL/);
  await dismissReveal(page);

  await page.click('.choice[data-player="george"][data-r="green"]');
  // That green earned the animal at three, so the count now points at five.
  assert.match(await page.locator('.reveal-chase').textContent(),
    /2 MORE GREENS TO GEORGE'S NEXT ANIMAL/);
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
  await dismissReveal(page);
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
  // Today is red for Izzy so the culprit picker is on screen for this check.
  const page = await open({
    [dayKey(1)]: { george: 'green', izzy: 'red' },
    [dayKey(0)]: { izzy: 'red', izzyCulprits: ['sweet', 'eatingout'] },
  });
  for (const view of ['today', 'calendar', 'scores']) {
    await page.click(`.tab[data-view="${view}"]`);
    await page.waitForTimeout(250);
    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1);
    assert.equal(overflows, false, `${view} scrolls sideways`);
  }
  await page.close();
});

test('a third green day unlocks an animal, with points rolling up', async () => {
  // Animals come from cumulative green days, not from a streak, so any three
  // greens do it — they do not have to be consecutive.
  const page = await open({
    [dayKey(9)]: { george: 'green' },
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

  const card = await page.locator('.reveal-card').textContent();
  assert.match(card, /A WILD \w+ APPEARS!/);
  assert.match(card, /JOINS GEORGE'S COLLECTION/);
  await page.close();
});

test('three green days in one week pay a bonus run and drop a prize', async () => {
  const target = bonusRunDay();
  const page = await open({
    // An older green day so the third in a row is the fourth green overall and
    // lands between rungs. A milestone would otherwise take the card, since an
    // animal joining the collection outranks one that is only visiting.
    [dayKey(target.offset + 9)]: { george: 'green' },
    [dayKey(target.offset + 2)]: { george: 'green' },
    [dayKey(target.offset + 1)]: { george: 'green' },
  });

  if (target.today) {
    await page.click('.choice[data-player="george"][data-r="green"]');
  } else {
    await page.click('.tab[data-view="calendar"]');
    await page.waitForTimeout(300);
    await page.click(`[data-open="${target.key}"]`);
    await page.click('#editorBody .choice[data-player="george"][data-r="green"]');
  }

  // The card names the prize; the banner carries the points and waits behind it.
  assert.match(await page.locator('.reveal-card').textContent(),
    /3 IN A ROW — BONUS RUN PRIZE/);
  assert.equal(await page.locator('.banner').count(), 0,
    'a banner must not play out unseen underneath the card');

  await dismissReveal(page);
  const banner = await waitForBanner(page, /3 IN A ROW!/);
  assert.match(banner, /BONUS RUN\. \+150/);
  assert.ok(await page.locator('#fx svg.hop').count() > 0, 'the prize should hop in');
  await page.close();
});

test('a bonus run is not paid twice for the same length in one week', async () => {
  // The prize and the bonus already landed in history, so re-rendering must not
  // replay them: a page load celebrates nothing (see the first test).
  const target = bonusRunDay();
  const page = await open({
    [dayKey(target.offset + 2)]: { george: 'green' },
    [dayKey(target.offset + 1)]: { george: 'green' },
    [target.key]: { george: 'green' },
  });
  assert.equal(await page.locator('.banner').count(), 0);
  assert.equal(await page.locator('#fx svg').count(), 0);
  assert.equal(await page.locator('.reveal-card').count(), 0);
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

  // The animal is the reward, not decoration, so it still turns up — it just
  // does not move. Suppressing it would leave the tap with no answer at all.
  await page.click('.choice[data-player="george"][data-r="green"]');
  const card = page.locator('.reveal-card');
  await card.waitFor({ state: 'visible' });
  assert.ok(await card.locator('svg').count() > 0);
  assert.ok(await card.evaluate((el) => el.getBoundingClientRect().height > 0));
  await dismissReveal(page);
  await page.close();
});

test('the reveal card fits a small phone without scrolling the page sideways',
  async () => {
    const page = await open({}, { viewport: { width: 320, height: 568 } });
    await page.click('.choice[data-player="george"][data-r="green"]');
    await page.locator('.reveal-card').waitFor({ state: 'visible' });

    const fit = await page.evaluate(() => {
      const r = document.querySelector('.reveal-box').getBoundingClientRect();
      return {
        top: r.top,
        bottom: r.bottom,
        viewport: window.innerHeight,
        sideways: document.documentElement.scrollWidth > window.innerWidth + 1,
      };
    });
    assert.equal(fit.sideways, false, 'the card scrolls the page sideways');
    assert.ok(fit.top >= -1 && fit.bottom <= fit.viewport + 1,
      `the card runs off screen: ${fit.top} to ${fit.bottom} of ${fit.viewport}`);
    await page.close();
  });

test('the culprit picker appears on a yellow and never on a green', async () => {
  const page = await open();
  assert.equal(await page.locator('.player .culprits').count(), 0,
    'an unrated day must ask for a colour before it asks what was eaten');

  await page.click('.choice[data-player="george"][data-r="yellow"]');
  await dismissReveal(page);
  assert.equal(await page.locator('.culprit[data-player="george"]').count(), 6);
  assert.equal(await page.locator('.culprit[data-player="izzy"]').count(), 0);

  await page.click('.choice[data-player="george"][data-r="green"]');
  await dismissReveal(page);
  assert.equal(await page.locator('.culprit[data-player="george"]').count(), 0);
  await page.close();
});

test('a culprit persists, toggles back off, and is cleared by a green', async () => {
  const page = await open({ [dayKey(0)]: { izzy: 'red' } });

  await page.click('.culprit[data-player="izzy"][data-c="takeout"]');
  await page.click('.culprit[data-player="izzy"][data-c="fizzy"]');
  await page.waitForTimeout(400);
  assert.deepEqual((await readStore(page))[dayKey(0)].izzyCulprits, ['takeout', 'fizzy']);
  assert.equal(
    await page.locator('.culprit[data-player="izzy"][data-c="takeout"]').getAttribute('aria-pressed'),
    'true');

  await page.click('.culprit[data-player="izzy"][data-c="takeout"]');
  await page.waitForTimeout(400);
  assert.deepEqual((await readStore(page))[dayKey(0)].izzyCulprits, ['fizzy']);

  // Turning the day green drops the culprits with it — a green day owns up to
  // nothing, and a stale list would outlive the rating it belonged to.
  await page.click('.choice[data-player="izzy"][data-r="green"]');
  await dismissReveal(page);
  assert.equal((await readStore(page))[dayKey(0)].izzyCulprits, undefined);
  await page.close();
});

test('a backfilled day can be told what was eaten from the calendar', async () => {
  const page = await open({ [dayKey(2)]: { george: 'yellow' } });
  await page.click('.tab[data-view="calendar"]');
  await page.waitForTimeout(300);
  await page.click(`[data-open="${dayKey(2)}"]`);

  await page.click('#editorBody .culprit[data-player="george"][data-c="alcohol"]');
  await page.waitForTimeout(400);
  assert.deepEqual((await readStore(page))[dayKey(2)].georgeCulprits, ['alcohol']);
  await page.close();
});

test('the day editor stays inside the viewport on a small phone', async () => {
  // Regression: two culprit pickers make the editor taller than a 568px phone,
  // and a centred flexbox pushed both the title and the CLOSE button off the
  // ends of the screen with no way to scroll back to either.
  const page = await open({ [dayKey(1)]: { george: 'red', izzy: 'yellow' } },
    { viewport: { width: 320, height: 568 } });
  await page.click('.tab[data-view="calendar"]');
  await page.waitForTimeout(300);
  await page.click(`[data-open="${dayKey(1)}"]`);
  await page.waitForTimeout(300);

  const box = await page.evaluate(() => {
    const el = document.querySelector('.modal-box');
    const r = el.getBoundingClientRect();
    return { top: r.top, bottom: r.bottom, viewport: window.innerHeight };
  });
  assert.ok(box.top >= -1, `editor top is off screen at ${box.top}`);
  assert.ok(box.bottom <= box.viewport + 1,
    `editor bottom is off screen at ${box.bottom} of ${box.viewport}`);

  await page.click('#editorClose');
  assert.equal(await page.locator('#editor').isVisible(), false);
  await page.close();
});

test('the scores view totals what has actually been eaten', async () => {
  const page = await open({
    [dayKey(3)]: { george: 'red', georgeCulprits: ['sweet', 'alcohol'] },
    [dayKey(2)]: { george: 'yellow', georgeCulprits: ['sweet'] },
    [dayKey(1)]: { izzy: 'green' },
  });
  await page.click('.tab[data-view="scores"]');
  await page.waitForTimeout(300);

  const rows = await page.locator('.scorecard').first().locator('.culprit-totals .statline')
    .allTextContents();
  assert.deepEqual(rows, ['SWEET TREAT2', 'ALCOHOL1']);
  // Izzy has recorded nothing, so that card gets no empty table.
  assert.equal(await page.locator('.scorecard').nth(1).locator('.culprit-totals').count(), 0);
  await page.close();
});

test('no page threw an error', async () => {
  const page = await open({ [dayKey(1)]: { george: 'green', izzy: 'yellow' } });
  await page.click('.tab[data-view="scores"]');
  await page.waitForTimeout(400);
  assert.deepEqual(page.errors, []);
  await page.close();
});
