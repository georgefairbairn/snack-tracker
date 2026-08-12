import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPRITES, SPRITE_SIZE, spriteSVG } from '../js/sprites.js';
import { TIER_POOLS, drawFor, collectionFor } from '../js/animals.js';

test('every sprite row is exactly the sprite width', () => {
  for (const [key, sprite] of Object.entries(SPRITES)) {
    assert.equal(sprite.rows.length, SPRITE_SIZE, `${key} has the wrong row count`);
    sprite.rows.forEach((row, i) => {
      assert.equal(row.length, SPRITE_SIZE, `${key} row ${i} is ${row.length} chars`);
    });
  }
});

test('every sprite pixel maps to a colour in its palette', () => {
  for (const [key, sprite] of Object.entries(SPRITES)) {
    for (const [ch, colour] of Object.entries(sprite.palette)) {
      assert.match(colour, /^#[0-9a-f]{6}$/i, `${key} palette '${ch}' is not a hex colour`);
    }
    sprite.rows.forEach((row, i) => {
      for (const ch of row) {
        if (ch === '.') continue;
        assert.ok(ch in sprite.palette, `${key} row ${i} uses '${ch}', not in its palette`);
      }
    });
  }
});

test('every animal referenced by a tier actually exists', () => {
  for (const [milestone, pool] of Object.entries(TIER_POOLS)) {
    for (const key of pool) {
      assert.ok(key in SPRITES, `tier ${milestone} references missing sprite '${key}'`);
    }
  }
});

test('sprites render to svg without a fill for transparent pixels', () => {
  const svg = spriteSVG('penguin');
  assert.match(svg, /^<svg/);
  assert.ok(svg.includes('shape-rendering="crispEdges"'));
  assert.ok(!svg.includes('fill="undefined"'));
});

test('a draw is stable for the same player, milestone and occurrence', () => {
  const a = drawFor('george', 7, 0);
  const b = drawFor('george', 7, 0);
  assert.equal(a, b, 'collections are derived, so draws must never move');
});

test('players draw independently', () => {
  const georges = [0, 1, 2, 3].map((i) => drawFor('george', 3, i));
  const izzys = [0, 1, 2, 3].map((i) => drawFor('izzy', 3, i));
  assert.notDeepEqual(georges, izzys, 'both players drawing the same order would be a bug');
});

test('a tier is exhausted before any animal repeats', () => {
  const pool = TIER_POOLS[3];
  const drawn = pool.map((_, i) => drawFor('george', 3, i));
  assert.equal(new Set(drawn).size, pool.length, 'no repeats within one pass');
  assert.equal(drawFor('george', 3, pool.length), drawn[0], 'wraps around after exhausting');
});

test('a collection is deduplicated and in the order first earned', () => {
  // Hit the 3-day milestone three times and the 7-day once.
  const collection = collectionFor('george', [3, 7, 3, 3]);
  const keys = collection.map((c) => c.key);
  assert.equal(new Set(keys).size, keys.length, 'no duplicates');
  assert.equal(collection[1].milestone, 7, 'order follows when each was earned');
  assert.equal(collection[1].tier, 'UNCOMMON');
});

test('an empty history unlocks nothing', () => {
  assert.deepEqual(collectionFor('izzy', []), []);
});
