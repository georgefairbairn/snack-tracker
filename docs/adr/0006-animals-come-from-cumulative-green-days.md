# Animals come from cumulative green Days, not Streaks

Milestones now count every green Day a Player has ever logged. Reaching a total of 3, 5, 7, 10, 14 and so on up the ladder in `js/animals.js` awards an animal, drawn from a rarity tier exactly as before.

Streak-based Milestones asked for perfection to make any progress at all. A Player four days into a run who ate a slice of cake on the fifth lost the animal and started again from nothing, and the natural response to that is to stop logging honestly — which is the one failure the tracker cannot survive. Cumulative Milestones make every honest green Day count for something permanent. A red Day still costs the Streak, the Multiplier and the points, so it is far from free; it just no longer erases progress towards the Collection.

## Bonus Runs keep consecutive days worth chasing

Removing Streaks from Milestones would leave nothing rewarding consecutive greens except the Multiplier. So a Bonus Run pays for 3, 4, 5, 6 and 7 green Days in a row inside a single week, at 150, 250, 400, 600 and 1,000 points, with a Prize animation on each of those days. A fully green week collects all five — 2,400 points, comfortably more than the 500 the old one-off Perfect Week paid, and repeatable every week rather than once ever.

Weeks run Monday to Sunday and never carry over. A run reset every Monday is the point: a Player who breaks a run on Tuesday is three days from the next bonus rather than watching a number they can no longer beat. Each length pays at most once per week, so `G G G X G G G` climbs to three twice and is paid for it once.

Yellow breaks a Bonus Run even though it still holds a Streak. A Bonus Run is literally green Days in a row, and if yellow both shielded a Streak and kept a bonus alive it would be the better button to press on a genuinely green day.

## The old Milestones keep their tiers

Collections are derived rather than stored (ADR 0005), so the ladder and the draw seeds are part of the data model in effect: change them and animals already unlocked silently become different animals.

Two things protect against that. The ladder keeps 3, 7, 14 and 30 on the tiers they had as Streak Milestones — and since a Streak of N implies at least N green Days, every Collection earned under the old rules is a prefix of the Collection the same history earns under these. The draw seeds also keep the old Milestone numbers, mapped through `TIER_SEEDS`, even though tiers are now named. Renaming the key would have reshuffled every tier.

Both the pools and the ladder are append-only from here, for the same reason: inserting a rung shifts every later draw of its tier by one. `test/sprites.test.mjs` asserts that a Collection only ever grows as green Days accumulate.

## Consequences

The ladder has exactly sixteen rungs for sixteen animals, so the last one lands at 150 green Days. That is a long game on purpose. It also means the ladder cannot be extended without new sprites, which is the right constraint — a Milestone that awards nothing visible is worse than no Milestone.

Prizes are the one reward that is not derived from history. They are shown once, at the moment the Bonus Run rung is reached, and never recomputed, which is why the Prize pool is free to drift as animals are added while the Collection draws are not.

## Considered Options

**Lowering the Streak Milestones instead** — 2, 4, 6 days rather than 3, 7, 14, 30. Cheaper to implement, but it treats the symptom: the animal still evaporates on a single bad day, which is the part that makes honest logging expensive.

**Awarding an animal every N green Days with no ladder** — simpler, and rejected because a flat interval cannot vary rarity. The tier a Milestone draws from is most of what makes one feel bigger than the last.
