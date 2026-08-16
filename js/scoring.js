import { isEditable, range, weekStartKey } from './dates.js';

export const PLAYERS = ['george', 'izzy'];
export const RATINGS = ['green', 'yellow', 'red'];

export const GREEN_BASE = 100;
export const YELLOW_FLAT = 25;
export const COOP_BONUS = 50;

// A Bonus Run is 3 to 7 green Days in a row inside a single week (Mon-Sun).
// Each length pays once per week and each one is a rung, not a replacement: a
// fully green week climbs all five and collects 2,400 on top of its greens.
// Yellow breaks a Bonus Run even though it holds a Streak — the run is
// literally green days in a row, and a shield that also paid a bonus would
// make yellow the better button.
export const BONUS_RUN_POINTS = { 3: 150, 4: 250, 5: 400, 6: 600, 7: 1000 };
export const BONUS_RUN_MIN = 3;
export const BONUS_RUN_MAX = 7;

// Multiplier tiers, keyed by the Streak length needed to reach them. A green
// Rating is worth GREEN_BASE x multiplier; yellow is never multiplied.
export const TIERS = [
  { streak: 0, mult: 1 },
  { streak: 3, mult: 2 },
  { streak: 5, mult: 3 },
  { streak: 7, mult: 4 },
  { streak: 10, mult: 5 },
  { streak: 14, mult: 6 },
  { streak: 21, mult: 7 },
  { streak: 30, mult: 8 },
];

export function tierIndexForStreak(streak) {
  let i = 0;
  while (i + 1 < TIERS.length && TIERS[i + 1].streak <= streak) i++;
  return i;
}

// Two consecutive yellows cost a tier, so riding yellows indefinitely decays a
// run instead of freezing it. A single honest yellow still costs nothing.
export function multiplierFor(streak, penalty) {
  const idx = Math.max(0, tierIndexForStreak(streak) - penalty);
  return TIERS[idx].mult;
}

// What a Day counts as for scoring. A Day inside the backfill window that has
// no Rating yet is `pending` — still fillable, so it must not break a Streak.
// Once it falls out of the window it becomes Unlogged and does. See adr/0003.
export function resolveDay(rating, key, todayKey) {
  if (rating) return rating;
  return isEditable(key, todayKey) ? 'pending' : 'unlogged';
}

function emptyState() {
  return {
    points: 0,
    streak: 0,
    bestStreak: 0,
    penalty: 0,
    consecutiveYellows: 0,
    // Every green Day a Player has ever logged. Animals are earned from this
    // rather than from a Streak, so a bad week costs points but never progress
    // towards the next animal. See docs/adr/0006.
    greenTotal: 0,
    weekKey: null,
    weekRun: 0,
    weekAwarded: new Set(),
    bonusRuns: [],
  };
}

/**
 * Walks every Day from the first logged Day to today and derives both Players'
 * totals. Pure: same Ratings in, same numbers out, no stored state anywhere.
 *
 * @param {Object} days   { 'YYYY-MM-DD': { george?: rating, izzy?: rating } }
 * @param {string} todayKey
 */
export function computeScores(days, todayKey) {
  const keys = Object.keys(days).filter((k) => days[k] && (days[k].george || days[k].izzy)).sort();
  const state = { george: emptyState(), izzy: emptyState() };
  if (keys.length === 0) return finalise(state);

  const start = keys[0] < todayKey ? keys[0] : todayKey;
  for (const key of range(start, todayKey)) {
    const entry = days[key] || {};
    const week = weekStartKey(key);
    const resolved = {};

    for (const player of PLAYERS) {
      const s = state[player];
      const r = resolveDay(entry[player], key, todayKey);
      resolved[player] = r;

      // Ahead of the pending check: a new week starts whether or not the Day
      // it starts on has been rated yet.
      if (s.weekKey !== week) {
        s.weekKey = week;
        s.weekRun = 0;
        s.weekAwarded = new Set();
      }

      if (r === 'pending') continue;

      if (r === 'green') {
        s.points += GREEN_BASE * multiplierFor(s.streak, s.penalty);
        s.streak += 1;
        s.penalty = 0;
        s.consecutiveYellows = 0;
        s.greenTotal += 1;
        if (s.streak > s.bestStreak) s.bestStreak = s.streak;

        s.weekRun += 1;
        // Once per length per week: a week of G G G X G G G climbs to 3 twice
        // but is paid for it once.
        if (s.weekRun >= BONUS_RUN_MIN && s.weekRun <= BONUS_RUN_MAX
            && !s.weekAwarded.has(s.weekRun)) {
          s.weekAwarded.add(s.weekRun);
          const points = BONUS_RUN_POINTS[s.weekRun];
          s.points += points;
          s.bonusRuns.push({ week, key, length: s.weekRun, points });
        }
      } else if (r === 'yellow') {
        s.points += YELLOW_FLAT;
        s.weekRun = 0;
        s.consecutiveYellows += 1;
        if (s.consecutiveYellows >= 2) {
          s.penalty += 1;
          s.consecutiveYellows = 0;
        }
      } else {
        // red, or unlogged: the run ends either way
        s.streak = 0;
        s.penalty = 0;
        s.consecutiveYellows = 0;
        s.weekRun = 0;
      }
    }

    if (resolved.george === 'green' && resolved.izzy === 'green') {
      state.george.points += COOP_BONUS;
      state.izzy.points += COOP_BONUS;
    }
  }

  return finalise(state);
}

function finalise(state) {
  const out = {};
  for (const player of PLAYERS) {
    const s = state[player];
    out[player] = {
      points: s.points,
      streak: s.streak,
      bestStreak: s.bestStreak,
      multiplier: multiplierFor(s.streak, s.penalty),
      greenTotal: s.greenTotal,
      weekRun: s.weekRun,
      bonusRuns: s.bonusRuns,
    };
  }
  return out;
}
