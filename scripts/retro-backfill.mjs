// One-off retro-backfill of the days nobody logged between 2026-08-27 and
// 2026-09-21.
//
// This is an ordinary client: it writes through the public REST API with the
// same public config the site uses, and every write is evaluated by
// firestore.rules like any other. It grants itself nothing. Dates outside the
// normal backfill window therefore FAIL with 403 unless a temporary exception
// is deployed first — that is the intended behaviour, not a bug to work around.
//
//   node scripts/retro-backfill.mjs                  # dry run, writes nothing
//   node scripts/retro-backfill.mjs --commit         # actually write
//
// Values are read from scripts/retro-values.json:
//
//   { "2026-08-27": { "george": "green", "izzy": "yellow" }, ... }
//
// Only the players named in each entry are touched. A day where Izzy already
// has a Rating and George does not keeps hers untouched, because each field is
// written under its own updateMask rather than replacing the document.

import { readFileSync } from 'node:fs';
import { firebaseConfig } from '../js/firebase-config.js';

const BASE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}`
  + '/databases/(default)/documents/days';

// The stretch this script is allowed to touch. Anything else is a mistake in
// the values file, not something to send and find out about.
const FIRST = '2026-08-27';
const LAST = '2026-09-21';

const PLAYERS = ['george', 'izzy'];
const RATINGS = ['red', 'yellow', 'green'];

const commit = process.argv.includes('--commit');

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

function validate(days) {
  for (const [date, entry] of Object.entries(days)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(`"${date}" is not a date key`);
    if (date < FIRST || date > LAST) fail(`${date} is outside ${FIRST}..${LAST}`);
    if (!entry || typeof entry !== 'object') fail(`${date} has no ratings`);

    const names = Object.keys(entry);
    if (!names.length) fail(`${date} has no ratings`);
    for (const name of names) {
      if (!PLAYERS.includes(name)) fail(`${date}: "${name}" is not a Player`);
      if (!RATINGS.includes(entry[name])) {
        fail(`${date}: "${entry[name]}" is not a Rating (${RATINGS.join(', ')})`);
      }
    }
  }
}

// Reads what is already stored, so the run can report what it would overwrite
// rather than silently replacing a Rating that was logged honestly at the time.
async function existing(date) {
  const res = await fetch(`${BASE}/${date}?key=${firebaseConfig.apiKey}`);
  if (res.status === 404) return {};
  if (!res.ok) throw new Error(`read ${date}: ${res.status} ${await res.text()}`);
  const body = await res.json();
  const out = {};
  for (const [field, value] of Object.entries(body.fields ?? {})) {
    if (typeof value.stringValue === 'string') out[field] = value.stringValue;
  }
  return out;
}

// One field per Player, under an updateMask, so the other Player's Rating and
// any Culprits already on the day survive untouched.
async function write(date, entry) {
  const url = new URL(`${BASE}/${date}`);
  url.searchParams.set('key', firebaseConfig.apiKey);
  for (const name of Object.keys(entry)) url.searchParams.append('updateMask.fieldPaths', name);

  const fields = {};
  for (const [name, rating] of Object.entries(entry)) fields[name] = { stringValue: rating };

  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 200)}`);
}

const days = JSON.parse(readFileSync('scripts/retro-values.json', 'utf8'));
validate(days);

const dates = Object.keys(days).sort();
console.log(`${commit ? 'WRITING' : 'DRY RUN'} — ${dates.length} days, ${FIRST}..${LAST}\n`);

let written = 0;
let skipped = 0;
let failed = 0;

for (const date of dates) {
  const entry = days[date];
  const before = await existing(date);

  const changes = [];
  const keep = [];
  for (const [name, rating] of Object.entries(entry)) {
    if (before[name] === rating) keep.push(`${name} already ${rating}`);
    else if (before[name]) changes.push(`${name} ${before[name]} -> ${rating}`);
    else changes.push(`${name} -> ${rating}`);
  }

  if (!changes.length) {
    console.log(`  ${date}  no change (${keep.join(', ')})`);
    skipped += 1;
    continue;
  }

  if (!commit) {
    console.log(`  ${date}  would set ${changes.join(', ')}`);
    continue;
  }

  try {
    await write(date, entry);
    console.log(`  ${date}  set ${changes.join(', ')}`);
    written += 1;
  } catch (err) {
    console.log(`  ${date}  FAILED — ${err.message}`);
    failed += 1;
  }
}

if (!commit) {
  console.log('\nNothing was written. Re-run with --commit once the values are right.');
} else {
  console.log(`\n${written} written, ${skipped} unchanged, ${failed} failed.`);
  if (failed) {
    console.log('A 403 means the rules rejected the date — the temporary exception is');
    console.log('not deployed, or has already expired.');
  }
}
