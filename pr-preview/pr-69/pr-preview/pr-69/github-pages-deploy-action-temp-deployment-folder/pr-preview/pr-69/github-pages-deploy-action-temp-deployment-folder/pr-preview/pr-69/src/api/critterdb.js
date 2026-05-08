import { normalizeMonster } from '../utils/normalize.js';

function extractEmbeddedJson(html) {
  const patterns = [
    /window\.__PRELOADED_STATE__\s*=\s*({[\s\S]*?});/,
    /window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});/,
    /"monsters"\s*:\s*(\[[\s\S]*?\])/,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match) continue;
    try {
      const raw = match[1].trim();
      if (raw.startsWith('[')) return { monsters: JSON.parse(raw) };
      return JSON.parse(raw);
    } catch {
      continue;
    }
  }
  return null;
}

function findMonstersInState(state) {
  if (!state || typeof state !== 'object') return [];
  if (Array.isArray(state)) return state;
  if (Array.isArray(state.monsters)) return state.monsters;
  for (const value of Object.values(state)) {
    const nested = findMonstersInState(value);
    if (nested.length) return nested;
  }
  return [];
}

export async function importCritterDbMonsters(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load CritterDB URL (${response.status}).`);
  const html = await response.text();
  const state = extractEmbeddedJson(html);
  if (!state) throw new Error('No importable CritterDB data found in page source.');
  const monsters = findMonstersInState(state);
  if (!monsters.length) throw new Error('No monsters found in CritterDB payload.');

  return monsters
    .filter((m) => m && m.name)
    .map((m) => normalizeMonster({
      name: m.name,
      cr: m.challengeRating ?? m.cr,
      type: m.stats?.race ?? m.type ?? null,
      alignment: m.alignment ?? null,
      source: 'CritterDB',
    }, 'critterdb'));
}
