import { firebaseConfig } from './firebase-config.js';

// One document per Day, holding both Players: days/{YYYY-MM-DD} -> { george, izzy }.
// One document per Day rather than per Player-Day means a single listener covers
// the whole history, which the scoring needs anyway to walk Streaks from the start.
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
  if (mode !== 'live') {
    const days = readLocal();
    days[dateKey] = { ...(days[dateKey] || {}), [player]: rating };
    writeLocal(days);
    return days;
  }
  const { doc, setDoc } = firestore;
  await setDoc(doc(db, 'days', dateKey), { [player]: rating }, { merge: true });
  return null;
}
