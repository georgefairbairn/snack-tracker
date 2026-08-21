import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SPRITES, SPRITE_SIZE, spriteSVG } from '../js/sprites.js';
import {
  BOSS, TIER_POOLS, LADDER, drawFor, collectionFor, greensToNextAnimal,
  milestonesFor, visitorFor,
} from '../js/animals.js';

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
  for (const [tier, pool] of Object.entries(TIER_POOLS)) {
    for (const key of pool) {
      assert.ok(key in SPRITES, `tier ${tier} references missing sprite '${key}'`);
    }
  }
});

test('the ladder climbs, and every rung names a real tier', () => {
  for (let i = 1; i < LADDER.length; i++) {
    assert.ok(LADDER[i].greens > LADDER[i - 1].greens,
      `rung ${i} does not come after the one before it`);
  }
  for (const rung of LADDER) {
    assert.ok(rung.tier in TIER_POOLS, `rung ${rung.greens} names an unknown tier`);
  }
});

test('the ladder has exactly one rung per animal', () => {
  const animals = Object.values(TIER_POOLS).reduce((n, pool) => n + pool.length, 0);
  assert.equal(LADDER.length, animals,
    'a short ladder strands animals; a long one draws duplicates that get deduplicated away');

  for (const [tier, pool] of Object.entries(TIER_POOLS)) {
    const rungs = LADDER.filter((r) => r.tier === tier).length;
    assert.equal(rungs, pool.length, `${tier} has ${rungs} rungs for ${pool.length} animals`);
  }
});

test('the whole ladder unlocks every animal exactly once', () => {
  const last = LADDER[LADDER.length - 1].greens;
  for (const player of ['george', 'izzy']) {
    const keys = collectionFor(player, last).map((c) => c.key);
    assert.equal(keys.length, new Set(keys).size, `${player} unlocked a duplicate`);
    assert.equal(new Set(keys).size,
      Object.values(TIER_POOLS).reduce((n, pool) => n + pool.length, 0),
      `${player} did not reach every animal`);
  }
});

test('the old streak milestones keep their tiers, so nobody loses an animal', () => {
  // Animals used to come from a Streak of 3, 7, 14 or 30. A Player with a
  // Streak of N has at least N green Days, so leaving those four rungs on their
  // original tiers makes every collection earned under the old rules a prefix
  // of the collection earned under these ones. See docs/adr/0006.
  const tierAt = (greens) => LADDER.find((r) => r.greens === greens)?.tier;
  assert.equal(tierAt(3), 'COMMON');
  assert.equal(tierAt(7), 'UNCOMMON');
  assert.equal(tierAt(14), 'RARE');
  assert.equal(tierAt(30), 'LEGENDARY');
});

test('milestones are the rungs already passed', () => {
  assert.deepEqual(milestonesFor(0), []);
  assert.deepEqual(milestonesFor(2), []);
  assert.deepEqual(milestonesFor(3), [{ greens: 3, tier: 'COMMON' }]);
  assert.equal(milestonesFor(6).length, 2, '3 and 5, not 7');
});

test('sprites render to svg without a fill for transparent pixels', () => {
  const svg = spriteSVG('penguin');
  assert.match(svg, /^<svg/);
  assert.ok(svg.includes('shape-rendering="crispEdges"'));
  assert.ok(!svg.includes('fill="undefined"'));
});

test('a draw is stable for the same player, tier and occurrence', () => {
  const a = drawFor('george', 'UNCOMMON', 0);
  const b = drawFor('george', 'UNCOMMON', 0);
  assert.equal(a, b, 'collections are derived, so draws must never move');
});

test('players draw independently', () => {
  const georges = [0, 1, 2, 3].map((i) => drawFor('george', 'COMMON', i));
  const izzys = [0, 1, 2, 3].map((i) => drawFor('izzy', 'COMMON', i));
  assert.notDeepEqual(georges, izzys, 'both players drawing the same order would be a bug');
});

test('izzy\'s first animal is always the pangolin', () => {
  assert.equal(drawFor('izzy', 'COMMON', 0), 'pangolin');
  assert.equal(collectionFor('izzy', 3)[0].key, 'pangolin');
});

test('the pin only affects izzy\'s first draw, not the rest', () => {
  const pool = TIER_POOLS.COMMON;
  const izzy = pool.map((_, i) => drawFor('izzy', 'COMMON', i));
  assert.equal(izzy[0], 'pangolin');
  assert.equal(new Set(izzy).size, pool.length, 'still a full permutation, no repeats');
  assert.equal(izzy.filter((a) => a === 'pangolin').length, 1, 'pangolin appears once');
});

test('george is not pinned', () => {
  const drawn = TIER_POOLS.COMMON.map((_, i) => drawFor('george', 'COMMON', i));
  assert.equal(new Set(drawn).size, TIER_POOLS.COMMON.length);
  assert.notEqual(drawn[0], drawFor('izzy', 'COMMON', 0),
    'the two players should not open the same');
});

test('a tier is exhausted before any animal repeats', () => {
  const pool = TIER_POOLS.COMMON;
  const drawn = pool.map((_, i) => drawFor('george', 'COMMON', i));
  assert.equal(new Set(drawn).size, pool.length, 'no repeats within one pass');
  assert.equal(drawFor('george', 'COMMON', pool.length), drawn[0],
    'wraps around after exhausting');
});

test('a collection is deduplicated and in the order first earned', () => {
  const collection = collectionFor('george', 10); // rungs 3, 5 and 7
  const keys = collection.map((c) => c.key);
  assert.equal(new Set(keys).size, keys.length, 'no duplicates');
  assert.deepEqual(collection.map((c) => c.greens), [3, 5, 7, 10],
    'order follows when each was earned');
  assert.equal(collection[2].tier, 'UNCOMMON');
});

test('a collection only ever grows as green days accumulate', () => {
  let previous = [];
  for (let greens = 0; greens <= 160; greens++) {
    const keys = collectionFor('george', greens).map((c) => c.key);
    assert.deepEqual(keys.slice(0, previous.length), previous,
      `the collection at ${greens} green days is not an extension of the one before it`);
    previous = keys;
  }
});

test('an empty history unlocks nothing', () => {
  assert.deepEqual(collectionFor('izzy', 0), []);
});

// ---------------------------------------------------------------- the visitor

test('the boss turns up on every red, for either player', () => {
  // Red always brings the same animal. It is the one that means you did badly,
  // so it has to be recognisable on sight rather than drawn.
  for (const player of ['george', 'izzy']) {
    for (const key of ['2026-08-12', '2026-01-01', '2027-12-31']) {
      assert.equal(visitorFor(player, key, 'red'), BOSS);
    }
  }
});

test('the boss is never collectable', () => {
  // Not in a tier, so no ladder position can ever draw it.
  assert.equal(Object.values(TIER_POOLS).flat().includes(BOSS), false);
  for (const player of ['george', 'izzy']) {
    const everything = collectionFor(player, 1000).map((c) => c.key);
    assert.equal(everything.includes(BOSS), false);
  }
});

test('a green or yellow visitor is drawn, stable, and never the boss', () => {
  const pool = Object.values(TIER_POOLS).flat();
  for (const rating of ['green', 'yellow']) {
    const visitor = visitorFor('george', '2026-08-12', rating);
    assert.ok(pool.includes(visitor), `${visitor} should come from the prize pool`);
    // Correcting a day back and forth must bring the same animal back rather
    // than dealing a new one on every tap.
    assert.equal(visitorFor('george', '2026-08-12', rating), visitor);
  }
});

test('visitors differ by player, day and rating', () => {
  const seen = new Set();
  for (const player of ['george', 'izzy']) {
    for (const key of ['2026-08-10', '2026-08-11', '2026-08-12']) {
      for (const rating of ['green', 'yellow']) seen.add(visitorFor(player, key, rating));
    }
  }
  assert.ok(seen.size > 1, 'a visitor that never changes is not a draw');
});

// ---------------------------------------------------------------- the chase

test('the countdown lands exactly on the day the collection grows', () => {
  for (const player of ['george', 'izzy']) {
    for (let greens = 0; greens < LADDER[LADDER.length - 1].greens; greens++) {
      const togo = greensToNextAnimal(player, greens);
      assert.ok(togo > 0, `at ${greens} greens there is still an animal to come`);
      const have = collectionFor(player, greens).length;
      assert.equal(collectionFor(player, greens + togo).length, have + 1,
        `${player} at ${greens} greens was promised an animal ${togo} greens away`);
      assert.equal(collectionFor(player, greens + togo - 1).length, have,
        `${player} at ${greens} greens got the animal earlier than promised`);
    }
  }
});

test('there is nothing left to chase once the ladder is finished', () => {
  const last = LADDER[LADDER.length - 1].greens;
  assert.equal(greensToNextAnimal('george', last), null);
  assert.equal(greensToNextAnimal('george', last + 50), null);
});
