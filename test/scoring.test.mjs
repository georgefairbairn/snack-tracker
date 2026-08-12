import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeScores } from '../js/scoring.js';
import { currentDayKey, isEditable, addDays } from '../js/dates.js';

const TODAY = '2026-08-12';

// Builds a days map from a list of [dateKey, georgeRating, izzyRating].
function build(rows) {
  const days = {};
  for (const [key, george, izzy] of rows) {
    days[key] = {};
    if (george) days[key].george = george;
    if (izzy) days[key].izzy = izzy;
  }
  return days;
}

// A run of consecutive Ratings for George ending on `end`.
function run(end, ratings) {
  const rows = [];
  for (let i = 0; i < ratings.length; i++) {
    rows.push([addDays(end, -(ratings.length - 1 - i)), ratings[i], null]);
  }
  return build(rows);
}

test('a single green is worth the base amount at x1', () => {
  const s = computeScores(run(TODAY, ['green']), TODAY);
  assert.equal(s.george.points, 100);
  assert.equal(s.george.streak, 1);
  assert.equal(s.george.multiplier, 1);
});

test('the multiplier only pays out from the day after it is reached', () => {
  // Streaks before each green are 0,1,2,3 -> x1,x1,x1,x2
  const s = computeScores(run(TODAY, ['green', 'green', 'green', 'green']), TODAY);
  assert.equal(s.george.points, 500);
  assert.equal(s.george.streak, 4);
  assert.equal(s.george.multiplier, 2);
});

test('a perfect week pays the bonus once', () => {
  const s = computeScores(run(TODAY, Array(7).fill('green')), TODAY);
  // 100+100+100+200+200+300+300 = 1300, plus the 500 bonus
  assert.equal(s.george.points, 1800);
  assert.equal(s.george.streak, 7);
  assert.equal(s.george.multiplier, 4);
  assert.equal(s.george.perfectWeekAwarded, true);
});

test('yellow is flat, never multiplied, and holds the streak', () => {
  const s = computeScores(run(TODAY, ['green', 'green', 'green', 'green', 'yellow']), TODAY);
  assert.equal(s.george.points, 525);
  assert.equal(s.george.streak, 4, 'yellow must not end the run');
  assert.equal(s.george.multiplier, 2, 'one yellow costs no tier');
});

test('two consecutive yellows drop a tier', () => {
  const s = computeScores(
    run(TODAY, ['green', 'green', 'green', 'green', 'green', 'yellow', 'yellow']), TODAY);
  assert.equal(s.george.points, 750);
  assert.equal(s.george.streak, 5, 'the run survives');
  assert.equal(s.george.multiplier, 2, 'x3 decayed to x2');
});

test('a green clears accumulated yellow decay', () => {
  const s = computeScores(
    run(TODAY, ['green', 'green', 'green', 'green', 'green', 'yellow', 'yellow', 'green']), TODAY);
  assert.equal(s.george.streak, 6);
  assert.equal(s.george.multiplier, 3, 'back to the tier the streak earns');
});

test('red scores nothing and resets everything', () => {
  const s = computeScores(run(TODAY, ['green', 'green', 'green', 'red']), TODAY);
  assert.equal(s.george.points, 300);
  assert.equal(s.george.streak, 0);
  assert.equal(s.george.multiplier, 1);
});

test('an unlogged day past the backfill window ends the streak', () => {
  const days = build([
    ['2026-08-01', 'green', null],
    [TODAY, 'green', null],
  ]);
  const s = computeScores(days, TODAY);
  assert.equal(s.george.points, 200, 'both greens score at x1');
  assert.equal(s.george.streak, 1, 'the gap broke the run');
});

test('an unrated day still inside the window does not break the streak', () => {
  const days = build([
    [addDays(TODAY, -2), 'green', null],
    [TODAY, 'green', null],
  ]);
  const s = computeScores(days, TODAY);
  assert.equal(s.george.streak, 2, 'yesterday is still fillable, so it is pending');
});

test('the co-op bonus pays both players only when both are green', () => {
  const days = build([
    [addDays(TODAY, -1), 'green', 'green'],
    [TODAY, 'green', 'yellow'],
  ]);
  const s = computeScores(days, TODAY);
  // George: 100 + 100 + one 50 co-op = 250
  assert.equal(s.george.points, 250);
  // Izzy: 100 + 25 + the same single co-op = 175
  assert.equal(s.izzy.points, 175);
});

test('players are scored independently', () => {
  const days = build([
    [addDays(TODAY, -1), 'green', 'red'],
    [TODAY, 'green', 'red'],
  ]);
  const s = computeScores(days, TODAY);
  assert.equal(s.george.streak, 2);
  assert.equal(s.izzy.streak, 0);
  assert.equal(s.izzy.points, 0);
});

test('best streak survives a reset', () => {
  const s = computeScores(run(TODAY, ['green', 'green', 'green', 'red', 'green']), TODAY);
  assert.equal(s.george.bestStreak, 3);
  assert.equal(s.george.streak, 1);
});

test('milestones are recorded as they are reached', () => {
  const s = computeScores(run(TODAY, Array(7).fill('green')), TODAY);
  assert.deepEqual(s.george.milestonesHit, [3, 7]);
});

test('no ratings at all scores nothing', () => {
  const s = computeScores({}, TODAY);
  assert.equal(s.george.points, 0);
  assert.equal(s.izzy.points, 0);
});

test('the day boundary is 4am, not midnight', () => {
  assert.equal(currentDayKey(new Date(2026, 7, 12, 23, 59)), '2026-08-12');
  assert.equal(currentDayKey(new Date(2026, 7, 13, 3, 30)), '2026-08-12',
    'a 3:30am snack belongs to the night before');
  assert.equal(currentDayKey(new Date(2026, 7, 13, 4, 1)), '2026-08-13');
});

test('the backfill window covers today and the two days before it', () => {
  assert.equal(isEditable(TODAY, TODAY), true);
  assert.equal(isEditable(addDays(TODAY, -2), TODAY), true);
  assert.equal(isEditable(addDays(TODAY, -3), TODAY), false);
  assert.equal(isEditable(addDays(TODAY, 1), TODAY), false, 'the future is never editable');
});
