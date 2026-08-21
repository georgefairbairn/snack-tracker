// A Culprit is the category of food or drink recorded against a yellow or red
// Rating. Optional, and never scored — see docs/adr/0007.

// Stored by key, so a key may never be renamed: the old name would be left
// pointing at nothing in every Day already recorded. Reordering this list is
// safe (it only changes display order) and appending to it is safe. Renaming or
// removing an entry is not.
export const CULPRITS = [
  { key: 'sweet', label: 'SWEET TREAT' },
  { key: 'savoury', label: 'SAVOURY TREAT' },
  { key: 'takeout', label: 'TAKE OUT' },
  { key: 'alcohol', label: 'ALCOHOL' },
  { key: 'eatingout', label: 'EATING OUT' },
  { key: 'fizzy', label: 'FIZZY DRINK' },
];

export const CULPRIT_KEYS = CULPRITS.map((c) => c.key);

// One Day cannot be more than all of them at once, and the Security Rules cap
// the stored list at the same number.
export const MAX_CULPRITS = CULPRITS.length;

// Only these Ratings carry Culprits. A green Day has nothing to own up to, so
// the picker never appears on one and any stored list is cleared.
export const RATINGS_WITH_CULPRITS = ['yellow', 'red'];

export function culpritField(player) {
  return `${player}Culprits`;
}

export function labelFor(key) {
  return CULPRITS.find((c) => c.key === key)?.label ?? key.toUpperCase();
}

export function acceptsCulprits(rating) {
  return RATINGS_WITH_CULPRITS.includes(rating);
}

/**
 * The Culprits recorded for one Player on one Day, in declaration order.
 *
 * Reads defensively: the database has no sign-in (docs/adr/0003), so a stored
 * list can contain anything that got past the Security Rules, and a key that
 * has since been dropped from CULPRITS would otherwise render as a blank chip.
 */
export function culpritsFor(entry, player) {
  const raw = entry?.[culpritField(player)];
  if (!Array.isArray(raw)) return [];
  return CULPRIT_KEYS.filter((key) => raw.includes(key));
}

/**
 * How often each Culprit turns up across a Player's whole history, commonest
 * first. Ties keep declaration order so the list does not reshuffle itself
 * between renders. Culprits that have never been recorded are left out.
 *
 * @param {Object} days { 'YYYY-MM-DD': { george?, izzy?, georgeCulprits?, izzyCulprits? } }
 */
export function culpritTotals(days, player) {
  const totals = new Map(CULPRIT_KEYS.map((key) => [key, 0]));
  for (const entry of Object.values(days ?? {})) {
    for (const key of culpritsFor(entry, player)) totals.set(key, totals.get(key) + 1);
  }
  return CULPRITS
    .map(({ key, label }) => ({ key, label, total: totals.get(key) }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
}
