import { dedupeMonsters } from '../utils/dedupe.js';

const DB_NAME = 'rm-encounters-v1';
const STORE = 'monsters';

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.createObjectStore(STORE, { keyPath: 'id' });
      store.createIndex('by_origin', 'origin', { unique: false });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllMonsters() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function upsertMonsters(monsters) {
  const db = await openDb();
  const existing = await getAllMonsters();
  const merged = dedupeMonsters([...existing, ...monsters]);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    store.clear();
    for (const monster of merged) store.put(monster);
    tx.oncomplete = () => resolve(merged.length);
    tx.onerror = () => reject(tx.error);
  });
}
