import { normalizeMonster } from '../utils/normalize.js';

function pickCr(item) {
  const candidates = [
    item.cr,
    item.challenge_rating,
    item.challengeRating,
    item.challenge?.rating,
    item.stats?.cr,
    item.stats?.challenge_rating,
  ];
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === '') continue;
    if (typeof candidate === 'object') {
      const nested = candidate.cr ?? candidate.value ?? candidate.rating ?? null;
      if (nested !== null && nested !== undefined && nested !== '') return nested;
      continue;
    }
    return candidate;
  }
  return null;
}

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
      const crValue = pickCr(item);
      const typeValue = item.type ?? item.creature_type ?? item.creatureType ?? null;
      const alignmentValue = item.alignment ?? item.alignments ?? null;
      const sourceValue = item.document__slug || item.document__title || item.document || null;
      all.push(normalizeMonster({
        name: item.name,
        cr: crValue,
        type: typeValue,
        alignment: alignmentValue,
        source: sourceValue,
      }, 'open5e'));
    }
    next = payload.next;
    page += 1;
    await new Promise((r) => setTimeout(r, 0));
  }

  return all;
}
