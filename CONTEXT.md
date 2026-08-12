# Snack Tracker

A two-person tracker where George and Izzy each record one honest judgement per day about whether they ate something unhealthy, and earn points for keeping clean runs going.

## Language

**Player**:
George or Izzy — one of the two people whose days are tracked. Chosen over neutral alternatives because the site is themed as a retro game.
_Avoid_: user, account, profile

**Rating**:
The single red, yellow or green judgement a Player records for one day. Red means they ate something properly bad, yellow something mildly bad, green nothing bad. The colour is the whole record — there is no underlying list of what was eaten.
_Avoid_: score, status, entry, log

**Points**:
The running numeric total a Player accumulates from their Ratings. Each Player's total is tracked separately.
_Avoid_: score, count, tally

**Streak**:
The number of consecutive days a Player has kept going without a red Rating. A yellow Rating holds a Streak without extending it; only a red ends one.
_Avoid_: run, chain, combo

**Unlogged**:
A past day that no longer accepts a Rating, because it fell outside the window in which days can still be filled in. Distinct from a red Rating: nothing was judged, but it ends a Streak all the same.
_Avoid_: missing, blank, skipped, empty

### Scoring

**Multiplier**:
The factor a Player's green Ratings are worth, rising in tiers as their Streak lengthens and falling back to its floor when a red ends the Streak. Yellow Ratings are never multiplied.
_Avoid_: combo, bonus, level

**Co-op Bonus**:
A flat bonus paid to both Players on any day they are both green. The one part of scoring that is shared rather than individual.
_Avoid_: team bonus, couple bonus

**Perfect Week**:
A one-off award for seven consecutive green Ratings, paid the first time a Player achieves it.
_Avoid_: clean week, full week

### A note on "score"

"Score" is deliberately banned. It was ambiguous between the day's colour and the running total, which are different things. Use **Rating** for the colour and **Points** for the total.
