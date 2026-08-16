# Snack Tracker

A two-person tracker where George and Izzy each record one honest judgement per day about whether they ate something unhealthy, and earn points for keeping clean runs going.

## Language

**Player**:
George or Izzy — one of the two people whose days are tracked. Chosen over neutral alternatives because the site is themed as a retro game.
_Avoid_: user, account, profile

**Day**:
The unit a Rating attaches to. A Day runs from 4am to 4am local time, not midnight to midnight, so a late-night snack belongs to the evening it happened in rather than the morning after.
_Avoid_: date, session, 24 hours

**Rating**:
The single red, yellow or green judgement a Player records for one day. Red means they ate something properly bad, yellow something mildly bad, green nothing bad. The colour is the whole record — there is no underlying list of what was eaten.
_Avoid_: score, status, entry, log

**Points**:
The running numeric total a Player accumulates from their Ratings. Each Player's total is tracked separately.
_Avoid_: score, count, tally

**Streak**:
The number of consecutive days a Player has kept going without a red Rating. A yellow Rating holds a Streak without extending it; only a red ends one. Drives the Multiplier and nothing else — animals come from Green Days.
_Avoid_: run, chain, combo

**Green Days**:
Every green Rating a Player has ever recorded, counted for good. Never reset by a red, a gap or a new week. The number animals are earned from.
_Avoid_: total greens, lifetime score, green count

**Week**:
Monday to Sunday. The span a Bonus Run lives inside; nothing carries across the boundary.
_Avoid_: seven days, rolling week

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

**Bonus Run**:
Three to seven green Days in a row inside one Week, paying an escalating bonus at each length. A yellow breaks a Bonus Run even though it holds a Streak — a Bonus Run is green days in a row, with nothing shielding it. Each length pays at most once per Week.
_Avoid_: perfect week, clean week, weekly streak, combo

### Rewards

**Milestone**:
A Green Days total that awards an animal. Reaching one draws from a rarity tier rather than granting a specific animal, so the Milestone is known in advance but the animal is not. Milestones counted Streak length until ADR 0006; they never do again.
_Avoid_: level, achievement, badge

**Collection**:
The animals a Player has unlocked. Each Player has their own, and the two will differ. Only unlocked animals are ever shown — there are no empty slots, so neither Player knows what remains or how many there are.
_Avoid_: inventory, zoo, gallery

**Prize**:
The animal that turns up, does one lap of the screen and leaves on each day of a Bonus Run. Announced, unlike a Secret, and never collected — a Prize joins no Collection, which is why it can be any animal at all.
_Avoid_: easter egg, reward, drop

**Secret**:
A hidden easter egg found by exploring rather than earned. Never referenced anywhere in the interface — a Secret that is advertised is not one. Distinct from a Prize, which is earned and announced.
_Avoid_: easter egg, unlockable, bonus

### A note on "score"

"Score" is deliberately banned. It was ambiguous between the day's colour and the running total, which are different things. Use **Rating** for the colour and **Points** for the total.
