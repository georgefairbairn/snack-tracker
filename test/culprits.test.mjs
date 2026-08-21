import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CULPRITS, CULPRIT_KEYS, acceptsCulprits, culpritField, culpritsFor, culpritTotals, labelFor,
} from '../js/culprits.js';
import { computeScores } from '../js/scoring.js';

const TODAY = '2026-08-12';

test('only yellow and red days are asked what was eaten', () => {
  assert.equal(acceptsCulprits('yellow'), true);
  assert.equal(acceptsCulprits('red'), true);
  assert.equal(acceptsCulprits('green'), false);
  assert.equal(acceptsCulprits(null), false);
});

test('culprits are stored in a field of their own, per player', () => {
  assert.equal(culpritField('george'), 'georgeCulprits');
  assert.equal(culpritField('izzy'), 'izzyCulprits');
});

test('a day with no culprits reads as an empty list', () => {
  assert.deepEqual(culpritsFor(undefined, 'george'), []);
  assert.deepEqual(culpritsFor({ george: 'red' }, 'george'), []);
  assert.deepEqual(culpritsFor({ george: 'red', izzyCulprits: ['fizzy'] }, 'george'), []);
});

test('culprits come back in declaration order however they were stored', () => {
  // The order the chips were tapped in must not leak into the display.
  const entry = { george: 'red', georgeCulprits: ['fizzy', 'sweet', 'takeout'] };
  assert.deepEqual(culpritsFor(entry, 'george'), ['sweet', 'takeout', 'fizzy']);
});

test('anything that is not a known culprit is ignored on read', () => {
  // There is no sign-in (adr/0003), so a stored list is not to be trusted, and
  // a key dropped from CULPRITS would otherwise render as a blank chip.
  const entry = { george: 'red', georgeCulprits: ['sweet', 'kebab', 'sweet'] };
  assert.deepEqual(culpritsFor(entry, 'george'), ['sweet']);
  assert.deepEqual(culpritsFor({ george: 'red', georgeCulprits: 'sweet' }, 'george'), []);
});

test('culprit totals cover a whole history, commonest first', () => {
  const days = {
    '2026-08-10': { george: 'red', georgeCulprits: ['sweet', 'fizzy'], izzy: 'green' },
    '2026-08-11': { george: 'yellow', georgeCulprits: ['sweet'], izzy: 'red', izzyCulprits: ['alcohol'] },
    '2026-08-12': { george: 'yellow', georgeCulprits: ['sweet', 'alcohol'] },
  };
  assert.deepEqual(culpritTotals(days, 'george'), [
    { key: 'sweet', label: 'SWEET TREAT', total: 3 },
    { key: 'alcohol', label: 'ALCOHOL', total: 1 },
    { key: 'fizzy', label: 'FIZZY DRINK', total: 1 },
  ]);
  assert.deepEqual(culpritTotals(days, 'izzy').map((c) => c.key), ['alcohol']);
});

test('totals for nothing are empty rather than a row of zeroes', () => {
  assert.deepEqual(culpritTotals({}, 'george'), []);
  assert.deepEqual(culpritTotals({ '2026-08-12': { george: 'red' } }, 'george'), []);
});

test('ties keep declaration order so the list does not reshuffle itself', () => {
  const days = { '2026-08-12': { george: 'red', georgeCulprits: CULPRIT_KEYS } };
  assert.deepEqual(culpritTotals(days, 'george').map((c) => c.key), CULPRIT_KEYS);
});

test('every culprit has a label and a unique key', () => {
  assert.equal(new Set(CULPRIT_KEYS).size, CULPRITS.length);
  for (const { key, label } of CULPRITS) {
    assert.match(key, /^[a-z]+$/, `${key} must stay a plain lowercase key`);
    assert.equal(labelFor(key), label);
  }
});

test('recording a culprit changes no score', () => {
  // Culprits are recorded, never scored — see docs/adr/0007. The two must stay
  // independent, or logging honestly starts costing points.
  const bare = { '2026-08-11': { george: 'yellow' }, '2026-08-12': { george: 'red' } };
  const tagged = {
    '2026-08-11': { george: 'yellow', georgeCulprits: ['sweet', 'alcohol'] },
    '2026-08-12': { george: 'red', georgeCulprits: ['takeout'] },
  };
  assert.deepEqual(computeScores(tagged, TODAY), computeScores(bare, TODAY));
});
