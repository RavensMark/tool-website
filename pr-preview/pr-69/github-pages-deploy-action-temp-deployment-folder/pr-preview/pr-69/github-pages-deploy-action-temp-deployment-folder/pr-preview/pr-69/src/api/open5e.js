import { normalizeMonster } from '../utils/normalize.js';

export async function fetchAllOpen5eMonsters(onProgress) {
  const all = [];
  let next = 'https://api.open5e.com/v2/creatures/';
  let page = 1;

  while (next) {
    onProgress?.(`Loading Open5e page ${page}...`);
    const response = await fetch(next);
    if (!response.ok) throw new Error(`Open5e request failed (${response.status})`);
    const payload = await response.json();
    const results = payload.results || [];
    for (const item of results) {
      all.push(normalizeMonster({
        name: item.name,
        cr: item.cr,
        type: item.type,
        alignment: item.alignment,
        source: item.document__slug || item.document__title || null,
      }, 'open5e'));
    }
    next = payload.next;
    page += 1;
    await new Promise((r) => setTimeout(r, 0));
  }

  return all;
}
