// A Day runs 4am -> 4am local time, not midnight -> midnight, so a late-night
// snack belongs to the evening it happened in. See docs/adr/0004.
export const DAY_START_HOUR = 4;

// How many days back a Rating can still be filled in or corrected, counting
// today. 3 means today plus the two days before it.
export const BACKFILL_DAYS = 3;

const pad = (n) => String(n).padStart(2, '0');

// Local calendar date as YYYY-MM-DD. Never UTC — storing UTC would shift
// history when either Player travels. See docs/adr/0004.
export function toKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// The Day that `now` falls inside. Before 4am, that is still yesterday.
export function currentDayKey(now = new Date()) {
  const shifted = new Date(now);
  shifted.setHours(shifted.getHours() - DAY_START_HOUR);
  return toKey(shifted);
}

export function addDays(key, n) {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function daysBetween(fromKeyStr, toKeyStr) {
  const ms = fromKey(toKeyStr) - fromKey(fromKeyStr);
  return Math.round(ms / 86400000);
}

// Inclusive list of date keys from `start` to `end`.
export function range(start, end) {
  const out = [];
  for (let k = start; daysBetween(k, end) >= 0; k = addDays(k, 1)) out.push(k);
  return out;
}

// The Monday of the week a Day falls in, as a date key. Weeks run Monday to
// Sunday to match the calendar, and a Bonus Run never carries across the
// boundary — Sunday-then-Monday is two weeks, not a run of two.
export function weekStartKey(key) {
  const back = (fromKey(key).getDay() + 6) % 7; // Monday-first
  return addDays(key, -back);
}

// A Day still open for editing: today, or within the backfill window. Future
// days are never editable.
export function isEditable(key, todayKey) {
  const back = daysBetween(key, todayKey);
  return back >= 0 && back < BACKFILL_DAYS;
}

export function monthLabel(year, month) {
  const names = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY',
    'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  return `${names[month]} ${year}`;
}
