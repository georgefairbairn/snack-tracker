import { currentDayKey, isEditable, toKey, fromKey, monthLabel, BACKFILL_DAYS } from './dates.js';
import { computeScores, PLAYERS, RATINGS } from './scoring.js';
import { collectionFor } from './animals.js';
import { spriteSVG, spriteName } from './sprites.js';
import * as store from './store.js';

const LABELS = { george: 'GEORGE', izzy: 'IZZY' };
const RATING_TEXT = { red: 'RED', yellow: 'YELLOW', green: 'GREEN' };

const $ = (id) => document.getElementById(id);

let days = {};
let todayKey = currentDayKey();
let scores = computeScores({}, todayKey);
let viewYear, viewMonth;
let editorKey = null;
// Milestone counts from the previous render, so a new unlock can be announced.
let lastMilestoneCount = { george: 0, izzy: 0 };
// Stays false until the store has delivered its first payload. Without it, every
// page load would replay every animal already earned as if it were new.
let hydrated = false;

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
    return `<div class="player">
      <div class="player-head">
        <span class="player-name">${LABELS[player]}</span>
        <span class="player-points">${s.points.toLocaleString()} PTS</span>
      </div>
      <div class="player-meta">
        <span>STREAK <b>${s.streak}</b></span>
        <span class="mult">MULT <b>x${s.multiplier}</b></span>
        <span>TODAY <b>${current ? RATING_TEXT[current] : '—'}</b></span>
      </div>
      ${choicesHTML(player, todayKey)}
    </div>`;
  }).join('');

  const bothGreen = PLAYERS.every((p) => ratingOf(todayKey, p) === 'green');
  $('todayHint').innerHTML = bothGreen
    ? 'CO-OP BONUS BANKED — +50 EACH'
    : `DAYS ROLL OVER AT 4AM<br>YOU CAN STILL FIX THE LAST ${BACKFILL_DAYS - 1} DAYS`;
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

    cells.push(`<${editable ? 'button' : 'div'} class="${cls.join(' ')}" ${editable ? `data-open="${key}"` : ''}>
      ${bars}<span>${day}</span>
    </${editable ? 'button' : 'div'}>`);
  }

  $('calendar').innerHTML = cells.join('');

  const now = new Date(todayKey.slice(0, 4), Number(todayKey.slice(5, 7)) - 1, 1);
  $('nextMonth').disabled = new Date(viewYear, viewMonth, 1) >= now;
}

function renderScores() {
  $('scores').innerHTML = PLAYERS.map((player) => {
    const s = scores[player];
    const critters = collectionFor(player, s.milestonesHit);
    const collection = critters.length
      ? `<div class="collection">${critters.map((c) => `
          <figure class="critter">${spriteSVG(c.key, { scale: 2 })}
            <figcaption>${spriteName(c.key)}</figcaption>
          </figure>`).join('')}</div>`
      : '<p class="collection-empty">NO CREATURES YET. KEEP A STREAK GOING.</p>';

    return `<div class="scorecard">
      <h2>${LABELS[player]}</h2>
      <div class="statline"><span>POINTS</span><b>${s.points.toLocaleString()}</b></div>
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
  scores = computeScores(days, todayKey);
  renderToday();
  renderCalendar();
  renderScores();
  renderEditor();
  announceNewMilestones();
}

// ---------------------------------------------------------------- easter eggs

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

function releaseWhale() {
  fx(spriteSVG('bluewhale', { scale: 6, className: 'swim' }));
}

function summonBoss() {
  fx(spriteSVG('hippo', { scale: 5, className: 'stomp' }), 2800);
  toast('THE HIPPO SAW THAT.');
}

function releaseMouse() {
  fx(spriteSVG('mouse', { scale: 3, className: 'scurry' }), 3400);
}

/** A new animal landed since the last render — announce it, don't spoil it early. */
function announceNewMilestones() {
  for (const player of PLAYERS) {
    const count = scores[player].milestonesHit.length;
    if (hydrated && count > lastMilestoneCount[player]) {
      const critters = collectionFor(player, scores[player].milestonesHit);
      const newest = critters[critters.length - 1];
      if (newest) {
        toast(`${LABELS[player]} UNLOCKED<br>${newest.tier} — ${spriteName(newest.key)}`, 5200);
        fx(spriteSVG(newest.key, { scale: 6, className: 'swim' }));
      }
    }
    lastMilestoneCount[player] = count;
  }
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
}

async function choose(player, key, rating) {
  const previous = ratingOf(key, player);
  const local = await store.setRating(key, player, rating);
  if (local) { days = local; renderAll(); }
  if (rating === 'red' && previous !== 'red') summonBoss();
}

function wireEvents() {
  document.addEventListener('click', (e) => {
    const choice = e.target.closest('.choice');
    if (choice) {
      choose(choice.dataset.player, choice.dataset.key, choice.dataset.r);
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

  wireEvents();
  wireKonami();
  renderAll();

  const mode = await store.init();
  const status = $('status');
  if (mode === 'live') {
    status.textContent = 'LIVE — SHARED WITH IZZY';
    status.className = 'status is-live';
  } else {
    status.textContent = 'OFFLINE — THIS DEVICE ONLY';
    status.className = 'status is-offline';
  }

  // The first payload sets the baseline silently; only changes after it are new.
  store.subscribe((next) => { days = next; renderAll(); hydrated = true; });
}

main();
