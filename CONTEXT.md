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
The number of consecutive days a Player has kept going without a red Rating.
_Avoid_: run, chain, combo

### A note on "score"

"Score" is deliberately banned. It was ambiguous between the day's colour and the running total, which are different things. Use **Rating** for the colour and **Points** for the total.
