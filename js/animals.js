// A Milestone draws from a rarity tier rather than granting a fixed animal, so
// the Milestone is known in advance but the animal is not. Draws are seeded
// from the Player and the tier, making a Collection a pure function of Rating
// history — nothing is stored. See docs/adr/0005.

export const TIER_POOLS = {
  COMMON: ['meerkat', 'tortoise', 'penguin', 'goat', 'pangolin'],
  UNCOMMON: ['zebra', 'flamingo', 'octopus', 'toucan'],
  RARE: ['elephant', 'tiger', 'orca', 'gorilla'],
  LEGENDARY: ['bluewhale', 'whiterhino', 'giantpanda'],
};

// Tiers were once keyed by the Streak length that unlocked them, and the draw
// seed was built from that number. Milestones now count cumulative green Days
// instead (see docs/adr/0006), but the seeds keep the old numbers: change them
// and every animal already unlocked silently becomes a different animal.
const TIER_SEEDS = { COMMON: '3', UNCOMMON: '7', RARE: '14', LEGENDARY: '30' };

// IMPORTANT: tiers may only ever be appended to. Reordering or removing an
// entry retroactively changes which animals Players have already unlocked,
// because the Collection is derived rather than stored.

// Cumulative green Days that award an animal, and the tier each one draws from.
// Sixteen rungs for sixteen animals, so the ladder ends exactly when the pools
// are exhausted. The four rungs that were the old Streak Milestones — 3, 7, 14
// and 30 — keep the tier they had, because a Player who reached a Streak of N
// necessarily has N green Days, so nobody loses an animal they already had.
//
// Append-only, like the pools, and for the same reason: inserting a rung shifts
// every later draw of that tier by one.
export const LADDER = [
  { greens: 3, tier: 'COMMON' },
  { greens: 5, tier: 'COMMON' },
  { greens: 7, tier: 'UNCOMMON' },
  { greens: 10, tier: 'COMMON' },
  { greens: 14, tier: 'RARE' },
  { greens: 18, tier: 'UNCOMMON' },
  { greens: 22, tier: 'COMMON' },
  { greens: 26, tier: 'COMMON' },
  { greens: 30, tier: 'LEGENDARY' },
  { greens: 36, tier: 'UNCOMMON' },
  { greens: 44, tier: 'RARE' },
  { greens: 55, tier: 'UNCOMMON' },
  { greens: 70, tier: 'RARE' },
  { greens: 90, tier: 'LEGENDARY' },
  { greens: 120, tier: 'RARE' },
  { greens: 150, tier: 'LEGENDARY' },
];

function xmur3(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(items, seed) {
  const rand = mulberry32(xmur3(seed)());
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Izzy's very first animal is always the pangolin, because it was asked for by
// name. Pinning it beats fishing for a seed that happens to produce it: this
// survives a rename, and it is obvious to the next reader that it is deliberate.
// Everything after the first draw follows the shuffle as normal.
const PINNED_FIRST = { izzy: 'pangolin' };
const FIRST_TIER = 'COMMON';

/** The full order a Player will draw a tier in — a permutation, so no repeats. */
function orderFor(player, tier) {
  const pool = TIER_POOLS[tier];
  if (!pool) return null;
  const shuffled = seededShuffle(pool, `${player}:${TIER_SEEDS[tier]}`);
  const pinned = PINNED_FIRST[player];
  if (tier === FIRST_TIER && pinned && shuffled.includes(pinned)) {
    return [pinned, ...shuffled.filter((animal) => animal !== pinned)];
  }
  return shuffled;
}

/**
 * Which animal a Player gets the `occurrence`-th time they draw `tier`. Draws
 * walk a seeded shuffle of the tier, so a Player never repeats an animal until
 * the whole tier is exhausted.
 */
export function drawFor(player, tier, occurrence) {
  const order = orderFor(player, tier);
  return order ? order[occurrence % order.length] : null;
}

/** The rungs of the ladder a Player's green Day total has passed. */
export function milestonesFor(greenTotal) {
  return LADDER.filter((rung) => greenTotal >= rung.greens);
}

/**
 * How many more green Days a Player needs before their Collection grows again,
 * or null once there is nothing left to earn.
 *
 * Measured by asking what the Collection would hold at each later rung rather
 * than by subtracting the next rung's number. Today every rung yields a new
 * animal, but `collectionFor` skips a draw it has already seen, and a ladder
 * that ever produced one would otherwise count down to an animal that never
 * turns up.
 */
export function greensToNextAnimal(player, greenTotal) {
  const have = collectionFor(player, greenTotal).length;
  for (const rung of LADDER) {
    if (rung.greens <= greenTotal) continue;
    if (collectionFor(player, rung.greens).length > have) return rung.greens - greenTotal;
  }
  return null;
}

/**
 * Derives a Player's Collection from their cumulative green Days. Deduplicated
 * and in the order first earned — a Collection is a set, and only unlocked
 * animals are ever shown.
 */
export function collectionFor(player, greenTotal) {
  const seen = new Set();
  const counts = new Map();
  const out = [];
  for (const rung of milestonesFor(greenTotal)) {
    const occurrence = counts.get(rung.tier) ?? 0;
    counts.set(rung.tier, occurrence + 1);
    const key = drawFor(player, rung.tier, occurrence);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ key, greens: rung.greens, tier: rung.tier });
  }
  return out;
}

// ---------------------------------------------------------------- prizes

// A Prize is what each day of a Bonus Run pays out on top of the points: an
// animal turns up, does one lap and leaves. It is never collected, which is why
// the pool can be every animal regardless of what a Player has unlocked — seeing
// a blue whale here is a tease, not a spoiler, and it cannot be mistaken for an
// unlock because nothing joins the Collection afterwards.
//
// Derived from the tiers rather than listed again, so a new animal is a Prize
// automatically. Safe to let drift, unlike a draw: a Prize is shown once, at the
// moment it is earned, and never recomputed from history.
//
// The hippo and the mouse are deliberately absent. The hippo is what a red Day
// summons and the mouse is a Secret; handing either out as a reward would blunt
// both of them.
const PRIZE_POOL = Object.values(TIER_POOLS).flat();

// How a Prize arrives, escalating with the length of the run so the seventh day
// is visibly bigger than the third.
const PRIZE_MOVES = { 3: 'hop', 4: 'scurry', 5: 'swim', 6: 'reveal', 7: 'parade' };

/**
 * The Prize for reaching `length` green Days in a row during the week starting
 * `week`. Seeded on the Player and the week, so the five days of one week bring
 * five different animals and next week brings a different five.
 */
export function prizeFor(player, week, length) {
  const order = seededShuffle(PRIZE_POOL, `prize:${player}:${week}`);
  return {
    key: order[length % order.length],
    move: PRIZE_MOVES[length] ?? 'hop',
  };
}

// What a red Day summons. Always the same animal, never drawn and never
// collected — the one animal that means you did badly has to be recognisable on
// sight, so it cannot also be a reward.
export const BOSS = 'hippo';

/**
 * The animal that turns up when a Rating is recorded. Red always summons the
 * boss; anything else draws from the Prize pool.
 *
 * Seeded on the Player and the Day only — deliberately NOT the Rating. Seeding
 * on the Rating too dealt a different animal for green, yellow and red, so
 * changing your mind about a Day paraded a new animal each time and read as a
 * Collection filling up. One Day brings one visitor, whatever you settle on.
 * Like any Prize this is shown and forgotten — it joins no Collection, so the
 * pool is free to drift as animals are added.
 */
export function visitorFor(player, dateKey, rating) {
  if (rating === 'red') return BOSS;
  return seededShuffle(PRIZE_POOL, `visit:${player}:${dateKey}`)[0];
}
