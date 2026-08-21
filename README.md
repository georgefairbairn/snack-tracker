# SNACK QUEST

A retro-gaming snack tracker for two. Each day George and Izzy record one honest
judgement — red, yellow or green — and earn points for keeping clean runs going.

No build step. Plain HTML, CSS and ES modules served straight from the repo by
GitHub Pages. The only runtime dependency is the Firebase SDK, loaded from
Google's CDN; the pixel font is self-hosted.

**Start here:** [`CONTEXT.md`](./CONTEXT.md) is the glossary — Rating, Points,
Streak, Multiplier and friends all mean specific things. [`docs/adr/`](./docs/adr)
records the decisions that look surprising on purpose.

## Setup

The site is already wired to a Firebase project. Two things must be done in the
Firebase console before it works:

1. **Create the Firestore database.** Firestore → Create database → production
   mode. Any region.
2. **Publish the Security Rules.** Copy [`firestore.rules`](./firestore.rules)
   into Firestore → Rules → Publish. Republish whenever that file changes — the
   rules validate the exact shape of a day document, so a version that predates
   Culprits will silently reject every attempt to record one.

Until step 2 is done the database is wide open. The site will appear to work
either way, so it is worth confirming.

GitHub Pages serves from the default branch, so this work has to reach `main`
before the live site changes.

### If Firestore is unreachable

The page falls back to this-device-only storage and says so in the header:
`OFFLINE — IZZY WON'T SEE THIS`. Nothing is shared in that state. If you see it
and you didn't expect to, Firestore is misconfigured or unreachable.

## Scoring

| Rating | Points | Effect on the run |
| --- | --- | --- |
| 🟢 Green | 100 × multiplier | Streak +1 |
| 🟡 Yellow | 25, never multiplied | Streak holds — survives, doesn't grow |
| 🔴 Red | 0 | Streak to 0, multiplier back to ×1 |

The multiplier climbs with the Streak — ×2 at 3 days, then 5, 7, 10, 14, 21 and
30, up to ×8. A green pays at the multiplier you had *before* it, so reaching a
new tier pays out from the next day.

**CO-OP BONUS** pays +50 each on any day both Players are green.

**BONUS RUNS** pay for green days in a row inside a single week, Monday to
Sunday:

| Green days in a row | Bonus | Running total |
| --- | --- | --- |
| 3 | +150 | 150 |
| 4 | +250 | 400 |
| 5 | +400 | 800 |
| 6 | +600 | 1,400 |
| 7 | +1,000 | 2,400 |

Every rung pays, so a fully green week collects all five. Each length pays at
most once per week, and nothing carries across Monday — break a run on Tuesday
and you are three days from the next bonus, not locked out until next week. Each
day of a Bonus Run also drops a **Prize**: an animal turns up, does a lap of the
screen and leaves. Prizes are not collected, so a Prize can be any animal,
including ones you have not unlocked.

Yellow breaks a Bonus Run even though it holds a Streak. A Bonus Run is green
days in a row and nothing shields it — otherwise yellow would be the better
button to press on a green day.

Yellow shielding a Streak is deliberate. If a yellow ended a run exactly like a
red, then on day 20 with one biscuit eaten you would simply log green — and the
moment the data becomes something you manage rather than record, the tracker is
decorative. To stop yellow being free, **two yellows in a row cost a tier**, so
slacking decays a run instead of freezing it.

A Day runs **4am to 4am local time**, because the 11pm crisps are exactly what
this is built to catch. Ratings can be set or corrected for **today and the two
days before it**; older days lock as Unlogged and end a Streak.

## What was it

Once a yellow or red is down, the day offers a second, optional question: what
was it? Tap any of **SWEET TREAT**, **SAVOURY TREAT**, **TAKE OUT**,
**ALCOHOL**, **EATING OUT** and **FIZZY DRINK** — as many as apply, or none.
Green days are never asked, and turning a day green drops whatever it had.

**Culprits are worth no points and cost none.** They do not touch the Streak,
the Multiplier, Bonus Runs or the ladder to the next animal, and `npm test`
asserts that the same history scores identically with and without them. A day
that was one beer has to be as cheap to record honestly as a day that was
nothing in particular, or the honest answer starts costing something — which is
the one failure this tracker cannot survive. See
[ADR 0007](./docs/adr/0007-culprits-are-recorded-but-never-scored.md).

The payoff is on the scores card: **WHAT GETS YOU**, a running total of what
each Player has actually recorded, commonest first. The categories live in
[`js/culprits.js`](./js/culprits.js) and may be reordered or appended to freely,
but a key may never be renamed — it is what every day already recorded points
at.

## Every rating shows an animal

Press any colour and an animal turns up on a card that **stays until you press
the screen**. Nothing about it is on a timer, and two cards queue rather than
replace each other, so logging both players one after the other shows both
animals. Each card also says **how many more greens the next animal needs**.

| What you pressed | What turns up |
| --- | --- |
| 🔴 Red | The hippo, always |
| Anything that crossed a milestone | The animal you just unlocked |
| Anything that completed a bonus run rung | That rung's prize |
| Anything else | A prize, drawn for you, the day and the colour |

The hippo is the **boss**. It is fixed rather than drawn, it is in no rarity
tier and no prize pool, and `npm test` asserts it never lands in a collection at
any green-day total. An animal that means you did badly has to be recognisable
on sight — if red dealt from the same pool as green the card would be a slot
machine, and a collectable hippo would make a red worth something.

Banners wait behind the card rather than playing out unseen underneath it, and
the card survives `prefers-reduced-motion` — it just stops moving. The reward is
not decoration. See
[ADR 0008](./docs/adr/0008-every-rating-raises-a-reveal.md).

## Animals

Animals come from **cumulative green days**, counted for good. Every green day
you have ever logged counts, and a red never takes any of them away. Reaching 3,
5, 7, 10, 14 green days and on up the ladder in
[`js/animals.js`](./js/animals.js) unlocks an animal drawn at random from that
rung's rarity tier. Sixteen rungs for sixteen animals; the last lands at 150.

Streaks used to gate the animals and it made a single bad day cost everything,
which is exactly the pressure that stops someone logging honestly. A red still
costs the Streak, the Multiplier and the points — it just no longer erases
progress towards the Collection. See
[ADR 0006](./docs/adr/0006-animals-come-from-cumulative-green-days.md).

Each Player draws separately, so your collections will differ. Only unlocked
animals are ever shown — no grey silhouettes, because visible empty slots turn a
surprise into a checklist.

Draws are seeded from the Player and the tier, so a Collection is a pure function
of Rating history and is never stored. One exception: Izzy's first animal is
pinned to the pangolin. Everything after it is drawn normally.

**The tiers and the ladder in [`js/animals.js`](./js/animals.js) may only be
appended to** — reordering either retroactively changes which animals you have
already unlocked. `npm test` asserts that a Collection only ever grows as green
days accumulate, which is the property that keeps this honest.

There are also easter eggs that are not milestones. They are not documented
here. That is the point of them.

## Animation

Scores roll up rather than snapping, greens throw pixel confetti, a red shakes
the cabinet, reaching a new multiplier tier raises a banner, and the calendar
cascades in when you change month. Each day of a Bonus Run sends a Prize across
the screen, getting bigger as the run gets longer — a hop, a scurry, a swim, a
full-screen reveal, and a parade on the seventh. The animal on a reveal card
pops in and then keeps breathing while it waits: a still sprite on a stopped
screen reads as a crash.

Banners queue rather than stack, since one tap can raise a bonus run and a
co-op bonus at once, and the queue holds entirely while a reveal card is up.

All of it is suppressed under `prefers-reduced-motion: reduce`, including the
starfield — that is a real setting people turn on for real reasons, not a
checkbox.

Three things to know if you touch the CSS. Animation rules live at the end of
the stylesheet, so **never restate `position` on an element that is already
`fixed`** — doing so once dropped the tab bar out of the viewport into the page
flow. The layer order matters too: the reveal card sits at 72, above the day
editor at 70 so a rating set from the calendar is answered on top of the modal
it was set in, and below `.fx` at 74 so a bonus-run prize laps across the front
of it. `[hidden] { display: none !important }` near the top is load-bearing:
without it `.modal { display: flex }` wins, and an invisible modal covers the
page and swallows every tap. And `.modal-box` carries `max-height: 100%` with
`overflow-y: auto` because the centring flexbox around it overflows in both
directions — drop either and a tall day editor pushes CLOSE off the bottom of a
small phone with no way to scroll to it.

## Why not a Game Boy palette

The obvious retro-handheld look is four shades of green. This entire product is a
red/yellow/green code, so it cannot be built in a palette with no red and no
yellow. NES it is.

## Development

```sh
npm test          # scoring, dates, sprites, animal draws — no dependencies
npm run serve     # then open http://localhost:8765

npm install                        # playwright, for the browser suite only
npx playwright install chromium
npm run test:browser               # drives the real page in a real browser
```

The scoring in [`js/scoring.js`](./js/scoring.js) is pure and has no DOM or
Firebase dependency, which is why it can be tested directly. If you change the
numbers, change the tests with them — several assertions are hand-calculated.

The browser suite in [`test/browser/`](./test/browser) starts its own static
server, so it needs nothing running. It earns its keep: every serious bug in
this project so far was caught there and would have survived a careful code
read — an invisible modal swallowing every tap, already-earned animals being
re-announced on each page load, and the tab bar falling out of the viewport.
Set `CHROME_PATH` to point at a browser Playwright did not install.

## Backups

[`.github/workflows/backup.yml`](./.github/workflows/backup.yml) writes every
Rating to `data/backup.json` nightly. Since there is no sign-in, a stranger who
finds the site could overwrite a day inside the backfill window; the rules stop
them doing anything worse, and this makes even that recoverable.
