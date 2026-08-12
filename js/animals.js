// A Milestone draws from a rarity tier rather than granting a fixed animal, so
// the Milestone is known in advance but the animal is not. Draws are seeded
// from the Player and the Milestone, making a Collection a pure function of
// Rating history — nothing is stored. See docs/adr/0005.

export const TIER_POOLS = {
  3: ['meerkat', 'tortoise', 'penguin', 'goat', 'pangolin'],
  7: ['zebra', 'flamingo', 'octopus', 'toucan'],
  14: ['elephant', 'tiger', 'orca', 'gorilla'],
  30: ['bluewhale', 'whiterhino', 'giantpanda'],
};

export const TIER_LABELS = {
  3: 'COMMON',
  7: 'UNCOMMON',
  14: 'RARE',
  30: 'LEGENDARY',
};

// IMPORTANT: tiers may only ever be appended to. Reordering or removing an
// entry retroactively changes which animals Players have already unlocked,
// because the Collection is derived rather than stored.

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
const FIRST_MILESTONE = Math.min(...Object.keys(TIER_POOLS).map(Number));

/** The full order a Player will draw a tier in — a permutation, so no repeats. */
function orderFor(player, milestone) {
  const pool = TIER_POOLS[milestone];
  if (!pool) return null;
  const shuffled = seededShuffle(pool, `${player}:${milestone}`);
  const pinned = PINNED_FIRST[player];
  if (milestone === FIRST_MILESTONE && pinned && shuffled.includes(pinned)) {
    return [pinned, ...shuffled.filter((animal) => animal !== pinned)];
  }
  return shuffled;
}

/**
 * Which animal a Player gets the `occurrence`-th time they reach `milestone`.
 * Draws walk a seeded shuffle of the tier, so a Player never repeats an animal
 * until the whole tier is exhausted.
 */
export function drawFor(player, milestone, occurrence) {
  const order = orderFor(player, milestone);
  return order ? order[occurrence % order.length] : null;
}

/**
 * Derives a Player's Collection from the Milestones their Rating history hit.
 * Deduplicated and in the order first earned — a Collection is a set, and only
 * unlocked animals are ever shown.
 */
export function collectionFor(player, milestonesHit) {
  const seen = new Set();
  const counts = new Map();
  const out = [];
  for (const milestone of milestonesHit) {
    const occurrence = counts.get(milestone) ?? 0;
    counts.set(milestone, occurrence + 1);
    const key = drawFor(player, milestone, occurrence);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ key, milestone, tier: TIER_LABELS[milestone] });
  }
  return out;
}
