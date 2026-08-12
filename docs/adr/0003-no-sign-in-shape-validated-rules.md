# No sign-in; access controlled by shape-validated rules

The site has no login. Opening the URL is enough to record a Rating. This is a deliberate product decision: the tracker only works if both Players log every day, and any friction on the path to tapping a colour is a threat to that habit.

Because the site is public and the Firebase config is visible in the page, access control cannot rest on identity. It rests on the shape of what may be written instead. Security Rules accept a write only when it targets `days/{YYYY-MM-DD}`, contains no fields beyond the two known Players, carries exactly one of the three valid Rating values for each, and lands on a date inside the backfill window. Deletes are rejected. History older than the backfill window is immutable.

## Consequences

Anyone who finds the URL can set one of the last few days to a valid colour. That is the entire blast radius — no data loss, no arbitrary writes, no deletion. A nightly backup of all Ratings into this repository covers even that, so vandalism inside the window is recoverable.

The rules are therefore load-bearing in a way that is easy to miss. Loosening them to "allow read, write: if true" while debugging would turn a bounded nuisance into total data loss, so treat any change to them as a security change.

## Considered Options

**A single shared Firebase account, signed in once per device** — stronger, and the friction was genuinely small (once per device, persisted indefinitely). Rejected because the owner did not want a sign-in step at all, and the data is low-stakes enough that the shape-validated rules are a reasonable substitute.
