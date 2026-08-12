# Public repo for GitHub Pages

The repo is public so that GitHub Pages can serve the site on the free tier. Pages does not publish from a private repo without a paid plan.

Going public costs us nothing we care about, because the repo holds only the site's code. Every Rating, Streak and Points total lives in Firebase, so nothing anyone ate is in this repository.

## Considered Options

**GitHub Pro to keep the source private** — rejected because it protects the wrong thing. Restricting who can *visit* a Pages site is an Enterprise-only feature, so the published site is publicly reachable under every plan. Pro would buy privacy of code while the site stayed open, which is not the threat worth spending on.

## Consequences

The site's URL is discoverable and the Firebase config is visible in the page. That config is an identifier rather than a secret, so this is expected — but it means access control is entirely the responsibility of Firebase Security Rules. An unauthenticated read or write must never be allowed to succeed. Obscurity of the URL is not part of the security model.
