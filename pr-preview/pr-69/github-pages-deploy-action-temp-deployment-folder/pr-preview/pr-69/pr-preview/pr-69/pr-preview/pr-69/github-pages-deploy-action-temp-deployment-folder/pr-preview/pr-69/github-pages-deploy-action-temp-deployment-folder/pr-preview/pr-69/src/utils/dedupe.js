import { dedupeKey } from './normalize.js';

const ORIGIN_PRIORITY = { open5e: 3, critterdb: 2, custom: 1 };

export function dedupeMonsters(monsters) {
  const map = new Map();
  for (const monster of monsters) {
    const key = dedupeKey(monster);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, monster);
      continue;
    }
    const currentPriority = ORIGIN_PRIORITY[monster.origin] || 0;
    const existingPriority = ORIGIN_PRIORITY[existing.origin] || 0;
    if (currentPriority > existingPriority) map.set(key, monster);
  }
  return [...map.values()];
}
