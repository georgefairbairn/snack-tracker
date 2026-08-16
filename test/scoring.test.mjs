import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeScores } from '../js/scoring.js';
import { currentDayKey, isEditable, addDays, weekStartKey } from '../js/dates.js';

// A Wednesday. Several tests below run backwards from it and must not cross a
// Monday unnoticed — Bonus Runs are scoped to a week.
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
  // Streaks before each green are 0,1,2,3 -> x1,x1,x1,x2. The last three land
  // in the week TODAY sits in, so a 3-in-a-row bonus rides along.
  const s = computeScores(run(TODAY, ['green', 'green', 'green', 'green']), TODAY);
  assert.equal(s.george.points, 500 + 150);
  assert.equal(s.george.streak, 4);
  assert.equal(s.george.multiplier, 2);
});

test('three greens in a week pay the first bonus run', () => {
  const s = computeScores(run(TODAY, ['green', 'green', 'green']), TODAY);
  // Three greens at x1, plus the 3-in-a-row bonus.
  assert.equal(s.george.points, 300 + 150);
  assert.equal(s.george.weekRun, 3);
  assert.deepEqual(s.george.bonusRuns.map((b) => b.length), [3]);
});

test('a bonus run pays every rung it climbs, once each', () => {
  // Mon-Sun, so all seven land in one week.
  const monday = weekStartKey(TODAY);
  const s = computeScores(run(addDays(monday, 6), Array(7).fill('green')), addDays(monday, 6));
  // Greens: 100+100+100+200+200+300+300 = 1300. Bonuses: 150+250+400+600+1000.
  assert.equal(s.george.points, 1300 + 2400);
  assert.deepEqual(s.george.bonusRuns.map((b) => b.length), [3, 4, 5, 6, 7]);
  assert.deepEqual(s.george.bonusRuns.map((b) => b.points), [150, 250, 400, 600, 1000]);
});

test('a bonus run does not carry across the week boundary', () => {
  // Three greens ending on the Monday: two fall in the week before it and one
  // after, so neither week ever sees three in a row.
  const monday = weekStartKey(TODAY);
  const s = computeScores(run(monday, Array(3).fill('green')), monday);
  assert.equal(s.george.streak, 3, 'the streak itself is unbroken');
  assert.equal(s.george.weekRun, 1, 'the new week starts the run again');
  assert.deepEqual(s.george.bonusRuns, [], 'no week saw three in a row');
});

test('a length is only paid once per week', () => {
  // green x3, red, green x3 — the second run climbs back to 3 but is not paid again.
  const sunday = addDays(weekStartKey(TODAY), 6);
  const days = run(sunday, ['green', 'green', 'green', 'red', 'green', 'green', 'green']);
  const s = computeScores(days, sunday);
  assert.deepEqual(s.george.bonusRuns.map((b) => b.length), [3], 'paid once, not twice');
});

test('yellow breaks a bonus run even though it holds the streak', () => {
  const sunday = addDays(weekStartKey(TODAY), 6);
  const s = computeScores(
    run(sunday, ['green', 'green', 'yellow', 'green', 'green']), sunday);
  assert.equal(s.george.streak, 4, 'the streak survives the yellow');
  assert.equal(s.george.weekRun, 2, 'the run of green days in a row does not');
  assert.deepEqual(s.george.bonusRuns, []);
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
  // 750 from the ratings, plus a 3- and a 4-in-a-row bonus from the first week.
  assert.equal(s.george.points, 750 + 400);
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

test('green days accumulate for good, across resets and gaps', () => {
  const s = computeScores(
    run(TODAY, ['green', 'green', 'red', 'green', 'yellow', 'green']), TODAY);
  assert.equal(s.george.greenTotal, 4, 'a red costs the streak, never the total');
  assert.equal(s.george.streak, 2, 'the yellow held the run the last two greens made');
});

test('a week is Monday to Sunday', () => {
  assert.equal(weekStartKey('2026-08-12'), '2026-08-10', 'wednesday -> monday');
  assert.equal(weekStartKey('2026-08-10'), '2026-08-10', 'monday is its own start');
  assert.equal(weekStartKey('2026-08-16'), '2026-08-10', 'sunday closes that week');
  assert.equal(weekStartKey('2026-08-17'), '2026-08-17', 'the next monday opens a new one');
});

test('no ratings at all scores nothing', () => {
  const s = computeScores({}, TODAY);
  assert.equal(s.george.points, 0);
  assert.equal(s.izzy.points, 0);
  assert.equal(s.george.greenTotal, 0);
  assert.deepEqual(s.george.bonusRuns, []);
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
