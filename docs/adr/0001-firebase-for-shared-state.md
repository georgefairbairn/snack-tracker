# Firebase for shared state

The site is hosted on GitHub Pages, which serves static files only — there is no server and no database. Two people logging from two separate phones need genuinely shared state, so we use the Firebase free tier as the datastore. At two-people-once-a-day volume this stays free indefinitely.

## Considered Options

**localStorage** — zero setup, but state is scoped per-browser-per-device. Each phone would hold its own private history with no way to see the other's. This removes the core premise of the product, and was only viable if both people committed to logging on one shared device.

**Data committed into the repo via the GitHub API** — the repo itself as the database. Rejected on security: it requires a write-scoped personal access token embedded in a publicly served page. It also turns every snack log into a git commit. This option looks attractive to anyone who notices we already have a repo, hence recording the rejection here.
