import { firebaseConfig } from './firebase-config.js';
import { CULPRIT_KEYS, acceptsCulprits, culpritField } from './culprits.js';

// One document per Day, holding both Players:
// days/{YYYY-MM-DD} -> { george, izzy, georgeCulprits, izzyCulprits }.
// One document per Day rather than per Player-Day means a single listener covers
// the whole history, which the scoring needs anyway to walk Streaks from the start.
//
// Culprits sit in a sibling field rather than nested under the Rating so that
// the Rating stays a plain string. Every Day recorded before Culprits existed
// remains a valid document, and the Security Rules keep listing each Player's
// fields by name instead of indexing a map by a variable key.
const SDK = 'https://www.gstatic.com/firebasejs/10.12.2';
const LOCAL_KEY = 'snack-tracker-days';

let db = null;
let firestore = null;
export let mode = 'connecting'; // 'live' | 'offline'

/**
 * Tries Firestore, falls back to this device's localStorage. The fallback keeps
 * the site usable if Firebase is unreachable, but it is per-device — the UI
 * shows a banner so nobody mistakes it for shared state.
 */
export async function init() {
  try {
    const [{ initializeApp }, fs] = await Promise.all([
      import(`${SDK}/firebase-app.js`),
      import(`${SDK}/firebase-firestore.js`),
    ]);
    const app = initializeApp(firebaseConfig);
    firestore = fs;
    db = fs.getFirestore(app);
    mode = 'live';
  } catch (err) {
    console.warn('Firestore unavailable, falling back to this device only:', err);
    mode = 'offline';
  }
  return mode;
}

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY)) || {};
  } catch {
    return {};
  }
}

function writeLocal(days) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(days));
}

/**
 * Calls back with the full days map, and again on every remote change.
 * Returns an unsubscribe function.
 */
export function subscribe(onDays) {
  if (mode !== 'live') {
    onDays(readLocal());
    return () => {};
  }
  const { collection, onSnapshot } = firestore;
  return onSnapshot(
    collection(db, 'days'),
    (snap) => {
      const days = {};
      snap.forEach((d) => { days[d.id] = d.data(); });
      onDays(days);
    },
    (err) => {
      console.warn('Snapshot failed, serving last known local copy:', err);
      onDays(readLocal());
    },
  );
}

export async function setRating(dateKey, player, rating) {
  // A green Day has nothing to own up to, so moving to green drops any Culprits
  // recorded while it was yellow or red. Same write, so the two never disagree.
  const field = culpritField(player);
  const clearing = !acceptsCulprits(rating);

  if (mode !== 'live') {
    const days = readLocal();
    const entry = { ...(days[dateKey] || {}), [player]: rating };
    if (clearing) delete entry[field];
    days[dateKey] = entry;
    writeLocal(days);
    return days;
  }
  const { doc, setDoc, deleteField } = firestore;
  const patch = { [player]: rating };
  if (clearing) patch[field] = deleteField();
  await setDoc(doc(db, 'days', dateKey), patch, { merge: true });
  return null;
}

/**
 * Replaces one Player's Culprits for a Day. An empty list removes the field
 * rather than storing `[]`, so a Day nobody answered for and a Day answered
 * with nothing look the same in the backup.
 */
export async function setCulprits(dateKey, player, culprits) {
  const field = culpritField(player);
  // Normalised to declaration order and to known keys only, so the stored list
  // does not depend on the order the chips were tapped in.
  const list = CULPRIT_KEYS.filter((key) => culprits.includes(key));

  if (mode !== 'live') {
    const days = readLocal();
    const entry = { ...(days[dateKey] || {}) };
    if (list.length) entry[field] = list;
    else delete entry[field];
    days[dateKey] = entry;
    writeLocal(days);
    return days;
  }
  const { doc, setDoc, deleteField } = firestore;
  await setDoc(doc(db, 'days', dateKey), { [field]: list.length ? list : deleteField() },
    { merge: true });
  return null;
}
