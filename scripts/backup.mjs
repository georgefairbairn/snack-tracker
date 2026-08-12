// Nightly backup of every Rating into the repo.
//
// The database has no sign-in, so a stranger who finds the site can overwrite a
// Day inside the backfill window. The rules stop them doing worse than that
// (see docs/adr/0003), and this backup makes even that recoverable.
//
// Reads go through the public Firestore REST API using the same public web
// config the site uses — the rules already allow anyone to read.

import { writeFileSync, mkdirSync } from 'node:fs';
import { firebaseConfig } from '../js/firebase-config.js';

const BASE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}`
  + '/databases/(default)/documents/days';

async function fetchAll() {
  const days = {};
  let pageToken = '';
  do {
    const url = new URL(BASE);
    url.searchParams.set('pageSize', '300');
    url.searchParams.set('key', firebaseConfig.apiKey);
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Firestore returned ${res.status}: ${await res.text()}`);
    const body = await res.json();

    for (const doc of body.documents ?? []) {
      const date = doc.name.split('/').pop();
      const entry = {};
      for (const [field, value] of Object.entries(doc.fields ?? {})) {
        if (typeof value.stringValue === 'string') entry[field] = value.stringValue;
      }
      days[date] = entry;
    }
    pageToken = body.nextPageToken ?? '';
  } while (pageToken);
  return days;
}

const days = await fetchAll();
const sorted = Object.fromEntries(Object.keys(days).sort().map((k) => [k, days[k]]));

mkdirSync('data', { recursive: true });
// Sorted keys and a trailing newline keep the diff readable and stable, so a
// day with no changes produces no commit.
writeFileSync('data/backup.json', `${JSON.stringify(sorted, null, 2)}\n`);
console.log(`backed up ${Object.keys(sorted).length} days`);
