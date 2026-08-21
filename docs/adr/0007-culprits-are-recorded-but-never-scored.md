# Culprits are recorded, but never scored

A yellow or red Rating can now carry Culprits: one or more of sweet treat, savoury treat, take out, alcohol, eating out and fizzy drink, listed in `js/culprits.js`. They are optional. A Day is complete the moment its colour is down, and the picker only appears after that colour is chosen.

Culprits affect nothing. Not Points, not the Streak, not the Multiplier, not Bonus Runs, not the ladder to the next animal. `computeScores` never reads them, and `test/culprits.test.mjs` asserts that the same history scores identically with and without them.

That restraint is the decision. The tracker survives on both Players logging honestly, and every previous ADR here has been about removing reasons to log dishonestly (ADR 0004 moved the day boundary to 4am so a late-night snack lands on the right day; ADR 0006 stopped a single red erasing progress towards the Collection). Making a Culprit cost points would reintroduce exactly that pressure at a finer grain: a red day that was one beer would be cheaper to record as a red day that was nothing in particular, and the honest answer would start costing something. A Culprit is a note to your future self about what actually happens, and it is worth having only while it is free.

The one payoff is on the scores card: a running total of what each Player has recorded, commonest first, under the stats it does not affect. Recording something has to lead somewhere, and a pattern is the whole reason to write it down.

## Stored beside the Rating, not inside it

A Day is `days/{YYYY-MM-DD} -> { george, izzy, georgeCulprits, izzyCulprits }`. Culprits sit in a sibling field rather than turning the Rating into an object.

The Rating therefore stays a plain string. Every Day recorded before this existed is still a valid document, there is no migration, and the Security Rules keep listing each Player's fields by name rather than indexing a map by a variable key — which ADR 0003 chose deliberately, to stay inside plainly supported rules syntax.

The rules validate shape only: known field names, a list of at most six known keys, nothing else. They do not check that a Culprit list sits on a yellow or red Day. Enforcing that would buy no security — a Culprit list on a green Day is well inside the blast radius a stranger already has — while adding a way for a legitimate write to be rejected. The app clears the list in the same write that turns a Day green, so the two never drift apart in practice.

Culprit keys are stored, so a key may never be renamed: the old name would be left pointing at nothing in every Day already recorded. Reordering the list is safe (it only changes display order) and appending to it is safe. This is a weaker constraint than the append-only rule on the animal ladder in ADR 0006, because nothing is derived from a Culprit's position.

## Consequences

Two Culprit pickers make the day editor taller than a small phone, and the centred flexbox it sits in pushed the CLOSE button off the bottom of the screen with no way to scroll to it. The editor now scrolls, with a browser test pinning it inside the viewport — the same failure mode as the invisible modal in the README, and found the same way.

## Considered Options

**Free text instead of categories** — records more, and rejected because it cannot be counted. "Cake", "birthday cake" and "a slice of cake" are three answers to one question, and a total nobody can read is not worth the extra typing on a phone at 11pm.

**Requiring a Culprit on every yellow and red** — makes the data complete, at the cost of putting a second question between a Player and a finished Day. The Rating is the thing that has to get logged every single time; anything that can stall it is a bad trade.

**Scoring Culprits differently** — a beer costing less than a takeaway. Tempting as game design and rejected above: it prices honesty.
