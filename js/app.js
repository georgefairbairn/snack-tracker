import { currentDayKey, isEditable, toKey, fromKey, monthLabel } from './dates.js';
import { computeScores, PLAYERS, RATINGS } from './scoring.js';
import { collectionFor } from './animals.js';
import { spriteSVG, spriteName } from './sprites.js';
import * as store from './store.js';

const LABELS = { george: 'GEORGE', izzy: 'IZZY' };
const RATING_TEXT = { red: 'RED', yellow: 'YELLOW', green: 'GREEN' };
const RATING_COLOUR = { red: '#e8402a', yellow: '#f5c518', green: '#3ac04a' };

const $ = (id) => document.getElementById(id);
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let days = {};
let todayKey = currentDayKey();
let scores = computeScores({}, todayKey);
let viewYear, viewMonth;
let editorKey = null;

// Stays false until the store has delivered its first payload. Without it, every
// page load would replay every animal already earned as if it were new.
let hydrated = false;
// Previous scores, so a render can tell what actually changed and celebrate it.
let previous = null;
let previousBothGreen = false;
// Panel flash queued by a tap, applied on the render that follows it.
let pendingFlash = null;
// Cascading the calendar on every data change would strobe, so only on a month change.
let lastCascade = null;

// ---------------------------------------------------------------- effects

function fx(html, ms = 6200) {
  const el = document.createElement('div');
  el.innerHTML = html;
  const node = el.firstElementChild;
  $('fx').appendChild(node);
  setTimeout(() => node.remove(), ms);
}

function toast(text, ms = 3600) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

// Banners can collide — a level-up and a co-op bonus land on the same tap — so
// they queue rather than stack on top of each other.
const bannerQueue = [];
let bannerRunning = false;

function banner(title, subtitle = '') {
  bannerQueue.push({ title, subtitle });
  if (!bannerRunning) nextBanner();
}

function nextBanner() {
  const item = bannerQueue.shift();
  if (!item) { bannerRunning = false; return; }
  bannerRunning = true;
  const el = document.createElement('div');
  el.className = 'banner';
  el.innerHTML = `${item.title}${item.subtitle ? `<small>${item.subtitle}</small>` : ''}`;
  document.body.appendChild(el);
  setTimeout(() => { el.remove(); nextBanner(); }, reducedMotion ? 400 : 1900);
}

function shake() {
  if (reducedMotion) return;
  document.body.classList.add('shake');
  setTimeout(() => document.body.classList.remove('shake'), 900);
}

/** Pixel confetti thrown from a screen point. */
function particles(x, y, colour, count = 14) {
  if (reducedMotion) return;
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
    const distance = 40 + Math.random() * 70;
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.background = colour;
    p.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
    p.style.setProperty('--dy', `${Math.sin(angle) * distance - 20}px`);
    p.style.setProperty('--dur', `${700 + Math.random() * 500}ms`);
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1300);
  }
}

function makeStars(n = 34) {
  if (reducedMotion) return;
  const wrap = document.createElement('div');
  wrap.className = 'stars';
  wrap.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i');
    s.className = 'star';
    s.style.left = `${Math.random() * 100}%`;
    s.style.top = `${Math.random() * 100}%`;
    s.style.animationDelay = `${Math.random() * 4}s`;
    wrap.appendChild(s);
  }
  document.body.appendChild(wrap);
}

// ---------------------------------------------------------------- points tween

// Points roll up rather than snapping, which is most of what makes a score feel
// like a score. Rendering writes the displayed value; this walks it to the real one.
const ROLL_MS = 750;
const displayed = { george: 0, izzy: 0 };
const tween = {
  george: { from: 0, to: 0, start: 0 },
  izzy: { from: 0, to: 0, start: 0 },
};
let tweening = false;

function tickPoints(now) {
  let active = false;
  for (const player of PLAYERS) {
    const t = tween[player];
    const progress = t.from === t.to ? 1 : Math.min(1, (now - t.start) / ROLL_MS);
    const eased = 1 - (1 - progress) ** 3; // ease-out: fast start, settles gently
    displayed[player] = Math.round(t.from + (t.to - t.from) * eased);
    if (progress < 1) active = true;

    for (const el of document.querySelectorAll(`[data-points="${player}"]`)) {
      el.textContent = displayed[player].toLocaleString();
      el.classList.toggle('counting', progress < 1);
    }
  }
  if (active) requestAnimationFrame(tickPoints);
  else tweening = false;
}

function startTween() {
  const now = performance.now();
  for (const player of PLAYERS) {
    const target = scores[player].points;
    if (tween[player].to === target) continue;
    tween[player] = reducedMotion
      ? { from: target, to: target, start: now }
      : { from: displayed[player], to: target, start: now };
  }
  if (!tweening) { tweening = true; requestAnimationFrame(tickPoints); }
}

// ---------------------------------------------------------------- rendering

function ratingOf(key, player) {
  return days[key]?.[player] ?? null;
}

function choicesHTML(player, key) {
  const current = ratingOf(key, player);
  return `<div class="choices">${RATINGS.map((r) => `
    <button class="choice" data-r="${r}" data-player="${player}" data-key="${key}"
            aria-pressed="${current === r}">${RATING_TEXT[r]}</button>`).join('')}</div>`;
}

function renderToday() {
  const d = fromKey(todayKey);
  $('dayLabel').textContent = `${['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][d.getDay()]} ${todayKey}`;

  $('players').innerHTML = PLAYERS.map((player) => {
    const s = scores[player];
    const current = ratingOf(todayKey, player);
    const flash = pendingFlash?.player === player ? ` flash-${pendingFlash.rating}` : '';
    return `<div class="player${flash}">
      <div class="player-head">
        <span class="player-name">${LABELS[player]}</span>
        <span class="player-points"><span data-points="${player}">0</span> PTS</span>
      </div>
      <div class="player-meta">
        <span>STREAK <b>${s.streak}</b></span>
        <span class="mult">MULT <b>x${s.multiplier}</b></span>
        <span>TODAY <b>${current ? RATING_TEXT[current] : '—'}</b></span>
      </div>
      ${choicesHTML(player, todayKey)}
    </div>`;
  }).join('');
  pendingFlash = null;

  $('todayHint').innerHTML = todayHint();
}

/** Tells you what the day is waiting on, rather than explaining the rules. */
function todayHint() {
  const george = ratingOf(todayKey, 'george');
  const izzy = ratingOf(todayKey, 'izzy');
  if (george === 'green' && izzy === 'green') return 'BOTH GREEN. +50 EACH.';
  if (george && izzy) return 'BOTH IN FOR TODAY.';
  if (george) return 'WAITING ON IZZY.';
  if (izzy) return 'WAITING ON GEORGE.';
  return 'HOW WAS TODAY?';
}

function renderCalendar() {
  $('monthLabel').textContent = monthLabel(viewYear, viewMonth);

  const first = new Date(viewYear, viewMonth, 1);
  const lead = (first.getDay() + 6) % 7; // Monday-first
  const total = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < lead; i++) cells.push('<div class="cell is-empty"></div>');

  for (let day = 1; day <= total; day++) {
    const key = toKey(new Date(viewYear, viewMonth, day));
    const future = key > todayKey;
    const editable = isEditable(key, todayKey);
    const cls = ['cell'];
    if (editable) cls.push('is-editable');
    if (key === todayKey) cls.push('is-today');
    if (future) cls.push('is-empty');

    const bars = future ? '' : PLAYERS.map((p) => {
      const r = ratingOf(key, p);
      return `<i${r ? ` data-r="${r}"` : ''}></i>`;
    }).join('');

    const delay = `--d:${Math.round((lead + day) * 14)}ms`;
    cells.push(`<${editable ? 'button' : 'div'} class="${cls.join(' ')}" style="${delay}" ${editable ? `data-open="${key}"` : ''}>
      ${bars}<span>${day}</span>
    </${editable ? 'button' : 'div'}>`);
  }

  const grid = $('calendar');
  grid.innerHTML = cells.join('');

  const monthKey = `${viewYear}-${viewMonth}`;
  grid.classList.toggle('cascade', lastCascade !== monthKey);
  lastCascade = monthKey;

  const thisMonth = new Date(Number(todayKey.slice(0, 4)), Number(todayKey.slice(5, 7)) - 1, 1);
  $('nextMonth').disabled = new Date(viewYear, viewMonth, 1) >= thisMonth;
}

function renderScores() {
  $('scores').innerHTML = PLAYERS.map((player) => {
    const s = scores[player];
    const critters = collectionFor(player, s.milestonesHit);
    const collection = critters.length
      ? `<div class="collection">${critters.map((c, i) => `
          <figure class="critter" style="--d:${i * 180}ms">${spriteSVG(c.key, { scale: 2 })}
            <figcaption>${spriteName(c.key)}</figcaption>
          </figure>`).join('')}</div>`
      : '<p class="collection-empty">NO ANIMALS YET.<br>KEEP IT CLEAN FOR 3 DAYS AND ONE TURNS UP.</p>';

    return `<div class="scorecard">
      <h2>${LABELS[player]}</h2>
      <div class="statline"><span>POINTS</span><b data-points="${player}">0</b></div>
      <div class="statline"><span>STREAK</span><b>${s.streak}</b></div>
      <div class="statline"><span>BEST STREAK</span><b>${s.bestStreak}</b></div>
      <div class="statline"><span>MULTIPLIER</span><b>x${s.multiplier}</b></div>
      <div class="statline"><span>PERFECT WEEK</span><b>${s.perfectWeekAwarded ? 'YES' : 'NO'}</b></div>
      ${collection}
    </div>`;
  }).join('');
}

function renderEditor() {
  if (!editorKey) return;
  $('editorTitle').textContent = editorKey;
  $('editorBody').innerHTML = PLAYERS.map((player) => `
    <div class="player">
      <div class="player-head"><span class="player-name">${LABELS[player]}</span></div>
      ${choicesHTML(player, editorKey)}
    </div>`).join('');
}

function renderAll() {
  const before = previous;
  scores = computeScores(days, todayKey);
  renderToday();
  renderCalendar();
  renderScores();
  renderEditor();
  startTween();
  if (before) celebrate(before);
  previous = structuredClone(scores);
  previousBothGreen = PLAYERS.every((p) => ratingOf(todayKey, p) === 'green');
}

// ---------------------------------------------------------------- celebration

/** Compares this render against the last and announces anything worth a fanfare. */
function celebrate(before) {
  if (!hydrated) return;

  for (const player of PLAYERS) {
    const was = before[player];
    const now = scores[player];

    if (now.milestonesHit.length > was.milestonesHit.length) {
      const critters = collectionFor(player, now.milestonesHit);
      const newest = critters[critters.length - 1];
      if (newest) {
        banner(`A WILD ${spriteName(newest.key)} APPEARS!`,
          `${newest.tier} — FOUND BY ${LABELS[player]}`);
        fx(spriteSVG(newest.key, { scale: 6, className: 'reveal' }), 2800);
      }
    } else if (now.multiplier > was.multiplier) {
      banner('LEVEL UP!', `${LABELS[player]} IS ON x${now.multiplier} NOW`);
    }

    if (now.perfectWeekAwarded && !was.perfectWeekAwarded) {
      banner('PERFECT WEEK!', `${LABELS[player]} — SEVEN IN A ROW. +500`);
    }
  }

  const bothGreen = PLAYERS.every((p) => ratingOf(todayKey, p) === 'green');
  if (bothGreen && !previousBothGreen) banner('BOTH GREEN!', 'CO-OP BONUS. +50 EACH.');
}

// ---------------------------------------------------------------- easter eggs

function releaseWhale() {
  fx(spriteSVG('bluewhale', { scale: 6, className: 'swim' }));
}

function summonBoss() {
  fx(spriteSVG('hippo', { scale: 5, className: 'stomp' }), 2800);
  toast('THE HIPPO SAW THAT.');
  shake();
}

function releaseMouse() {
  fx(spriteSVG('mouse', { scale: 3, className: 'scurry' }), 3400);
}

function wireKonami() {
  const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
    'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let pos = 0;
  window.addEventListener('keydown', (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    pos = key === code[pos] ? pos + 1 : (key === code[0] ? 1 : 0);
    if (pos === code.length) { pos = 0; releaseWhale(); }
  });

  // Mobile has no keyboard, so the whale also answers a rapid burst of taps
  // on the logo. Never mentioned in the UI — see CONTEXT.md, "Secret".
  let taps = 0, timer = null;
  $('logoSecret').closest('.logo').addEventListener('click', (e) => {
    if (e.target.id === 'logoSecret') return;
    taps++;
    clearTimeout(timer);
    timer = setTimeout(() => { taps = 0; }, 600);
    if (taps >= 7) { taps = 0; releaseWhale(); }
  });
}

// ---------------------------------------------------------------- events

function switchView(name) {
  for (const tab of document.querySelectorAll('.tab')) {
    tab.classList.toggle('is-active', tab.dataset.view === name);
  }
  for (const view of ['today', 'calendar', 'scores']) {
    $(`view-${view}`).hidden = view !== name;
  }
  // The tween writes into whichever view is now on screen.
  startTween();
}

async function choose(player, key, rating, origin) {
  const previousRating = ratingOf(key, player);
  pendingFlash = { player, rating };

  if (origin && rating !== 'red') {
    particles(origin.x, origin.y, RATING_COLOUR[rating], rating === 'green' ? 16 : 8);
  }

  const local = await store.setRating(key, player, rating);
  if (local) { days = local; renderAll(); }

  if (rating === 'red' && previousRating !== 'red') summonBoss();
}

function wireEvents() {
  document.addEventListener('click', (e) => {
    const choice = e.target.closest('.choice');
    if (choice) {
      const box = choice.getBoundingClientRect();
      choose(choice.dataset.player, choice.dataset.key, choice.dataset.r,
        { x: box.left + box.width / 2, y: box.top + box.height / 2 });
      return;
    }
    const open = e.target.closest('[data-open]');
    if (open) {
      editorKey = open.dataset.open;
      renderEditor();
      $('editor').hidden = false;
      return;
    }
    if (e.target.id === 'logoSecret') releaseMouse();
  });

  for (const tab of document.querySelectorAll('.tab')) {
    tab.addEventListener('click', () => switchView(tab.dataset.view));
  }

  $('editorClose').addEventListener('click', () => { $('editor').hidden = true; editorKey = null; });
  $('editor').addEventListener('click', (e) => {
    if (e.target.id === 'editor') { $('editor').hidden = true; editorKey = null; }
  });

  $('prevMonth').addEventListener('click', () => {
    viewMonth--;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    renderCalendar();
  });
  $('nextMonth').addEventListener('click', () => {
    viewMonth++;
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    renderCalendar();
  });

  // The Day can roll over while the page sits open overnight.
  setInterval(() => {
    const now = currentDayKey();
    if (now !== todayKey) { todayKey = now; renderAll(); }
  }, 60_000);
}

// ---------------------------------------------------------------- boot

async function main() {
  const d = fromKey(todayKey);
  viewYear = d.getFullYear();
  viewMonth = d.getMonth();

  makeStars();
  wireEvents();
  wireKonami();
  renderAll();

  const mode = await store.init();
  const status = $('status');
  if (mode === 'live') {
    status.textContent = 'CONNECTED — IZZY SEES THIS TOO';
    status.className = 'status is-live';
  } else {
    status.textContent = "OFFLINE — IZZY WON'T SEE THIS";
    status.className = 'status is-offline';
  }

  // The first payload sets the baseline silently; only changes after it are new.
  store.subscribe((next) => {
    days = next;
    renderAll();
    hydrated = true;
  });
}

main();
