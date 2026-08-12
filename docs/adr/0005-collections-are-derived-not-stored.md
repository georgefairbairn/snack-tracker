# Collections are derived, not stored

A Player's Collection is never written to the database. Each Milestone draw is seeded from the Player's name and the Milestone number, making the whole Collection a pure function of that Player's Rating history — recomputed on page load, identical every time.

The draws still feel random to the Players, because neither knows the seeding scheme or which animal sits behind a given tier and index.

## Consequences

There is no write path for Collections, which matters more than usual here: the database has no sign-in (see ADR 0003), so every stored field is a field a stranger could write. Deriving the Collection means nobody can grant themselves a blue whale, and there is no extra state to keep consistent with the Ratings it depends on.

The cost is that the animal tiers and the seeding function become part of the data model in effect, even though they live in code. Changing the contents or ordering of a tier retroactively changes which animals Players have already unlocked. If the tiers ever need editing after launch, they must be appended to rather than reordered.

## Considered Options

**Storing unlocked animals as records** — the obvious approach, and rejected for the two reasons above: it adds a writable surface to an unauthenticated database, and it duplicates state that the Rating history already fully determines.
