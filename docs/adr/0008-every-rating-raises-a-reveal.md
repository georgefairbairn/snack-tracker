# Every Rating raises a Reveal, and it waits to be dismissed

Pressing any of the three colours now puts an animal on the screen, on a card that stays until the screen is pressed. Red always summons the Boss — the hippo, and only ever the hippo. A Rating that crossed a Milestone shows the animal it just earned. A Rating that completed a rung of a Bonus Run shows that rung's Prize. Everything else shows a Prize drawn for the Player, the Day and the colour. Every card also says how many more green Days the next animal needs.

Before this, most taps answered with nothing but a panel flash. Animals appeared on a Milestone or a Bonus Run, which is to say on perhaps one tap in ten, and the other nine were silent. The point of the Reveal is that logging a day is the behaviour the whole thing depends on, and it should be the moment that pays out — including, and especially, on a bad day. A red now brings the biggest reaction on the site.

## The Boss is not a reward

The hippo is fixed rather than drawn, and it is absent from the Prize pool and from every tier, so no ladder position can produce it. `test/sprites.test.mjs` asserts that it never appears in a Collection at any green Day total.

An animal that means you did badly has to be recognisable on sight. If red dealt from the same pool as green, the animal would stop carrying the news and the card would be a slot machine — and if the hippo were ever collectable, a red would start being worth something.

## It waits rather than expires

Everything else on the site is on a timer: banners run for 1.9 seconds, Prize laps for three to six. A Reveal has no timer. It is dismissed by pressing anywhere, and a second Reveal queues behind the first rather than replacing it, so logging both Players one after the other shows both animals.

That makes it the one thing on the site that can be missed only deliberately, which is what a reward has to be. It also means it can be read at a glance while walking, which is when a day actually gets logged.

Banners wait behind it for the same reason. A "3 IN A ROW! +150" banner playing out underneath a card that covers the screen is worse than no banner at all, so `nextBanner` holds while a Reveal is up and resumes when it is dismissed.

The card is raised from the Rating being pressed, not from the render that follows it — the animal is on screen before the store has answered. That also means a press that changes nothing still raises one, which is the promise: every press.

## The countdown

`greensToNextAnimal` measures how far off the next animal is by asking what the Collection would hold at each later rung, rather than by subtracting the next rung's number. Every rung yields a new animal today, but `collectionFor` skips a draw it has already seen, and a ladder that ever produced one would otherwise count down to an animal that never turned up. A test walks every green total up to the end of the ladder and checks the countdown lands exactly on the Day the Collection grows, and never a Day early.

It says nothing once the ladder is finished. A row reading zero would be a worse way to find that out than the Collection simply stopping.

## Consequences

Announcements that used to be duplicated are gone. A newly unlocked animal no longer raises a banner, because the card names it; the Prize toast is gone for the same reason, and with it the `toast` helper and its styles. Points, streaks and co-op bonuses still use banners — they are numbers, not animals.

The card sits above the day editor (z-index 72 against 70) so a Rating set from the calendar is answered on top of the modal it was set in, and below `.fx` (74) so a Bonus Run Prize laps across the front of it rather than disappearing behind it. `.fx` never intercepts a tap, so the card underneath stays dismissible wherever the screen is pressed.

Recording a Culprit now takes one more tap: the card has to be pressed away first. That is the cost of the card being unmissable, and it falls on the optional half of the interaction rather than the Rating itself.

Under `prefers-reduced-motion: reduce` the card still appears — it just does not move. The reward is not decoration, and suppressing it would leave the tap with no answer at all.

## Considered Options

**Expiring the card after a few seconds** — consistent with everything else on the site, and rejected because the two situations are different. A banner repeats a number that is also on the panel behind it, so missing one costs nothing. The animal exists only in that moment.

**Replacing the card when a second Rating is logged** — simpler than a queue, and it loses an animal exactly when both Players are logging together, which is the best moment of the day.

**Drawing red's animal like any other** — more variety, and it destroys the signal. Red is the only colour whose animal has a job.
