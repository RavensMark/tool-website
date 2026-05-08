import { fetchAllOpen5eMonsters } from './api/open5e.js';
import { importCritterDbMonsters } from './api/critterdb.js';
import { getAllMonsters, upsertMonsters, replaceOriginMonsters } from './db/indexeddb.js';
import { buildFilters, applyFilters } from './ui/filters.js';
import { renderMonsterTable } from './ui/table.js';
import { setMessage } from './ui/importPanel.js';

const CACHE_META_KEY = 'rm-encounter-open5e-meta-v1';
const OPEN5E_REFRESH_MS = 1000 * 60 * 60 * 24 * 7;

const XP_BY_CR = {
  '0': 10, '1/8': 25, '0.125': 25, '1/4': 50, '0.25': 50, '1/2': 100, '0.5': 100,
  '1': 200, '2': 450, '3': 700, '4': 1100, '5': 1800, '6': 2300, '7': 2900, '8': 3900,
  '9': 5000, '10': 5900, '11': 7200, '12': 8400, '13': 10000, '14': 11500, '15': 13000,
  '16': 15000, '17': 18000, '18': 20000, '19': 22000, '20': 25000, '21': 33000, '22': 41000,
  '23': 50000, '24': 62000, '25': 75000, '26': 90000, '27': 105000, '28': 120000, '29': 135000, '30': 155000,
};

const XP_BUDGETS_BY_LEVEL = {
  1: { low: 50, moderate: 75, hard: 100 }, 2: { low: 100, moderate: 150, hard: 200 },
  3: { low: 150, moderate: 225, hard: 400 }, 4: { low: 250, moderate: 375, hard: 500 },
  5: { low: 500, moderate: 750, hard: 1100 }, 6: { low: 600, moderate: 1000, hard: 1400 },
  7: { low: 750, moderate: 1300, hard: 1700 }, 8: { low: 1000, moderate: 1700, hard: 2100 },
  9: { low: 1300, moderate: 2000, hard: 2600 }, 10: { low: 1600, moderate: 2300, hard: 3100 },
  11: { low: 1900, moderate: 2900, hard: 4100 }, 12: { low: 2200, moderate: 3700, hard: 4700 },
  13: { low: 2600, moderate: 4200, hard: 5400 }, 14: { low: 2900, moderate: 4900, hard: 6200 },
  15: { low: 3300, moderate: 5400, hard: 7800 }, 16: { low: 3800, moderate: 6100, hard: 9800 },
  17: { low: 4500, moderate: 7200, hard: 11700 }, 18: { low: 5000, moderate: 8700, hard: 14200 },
  19: { low: 5500, moderate: 10700, hard: 17200 }, 20: { low: 6400, moderate: 13200, hard: 22000 },
};

const state = { monsters: [], filters: { search: '', crMin: '', crMax: '', type: '', alignment: '', source: '' } };

const els = {
  tbody: document.getElementById('encounter-monsters-body'),
  status: document.getElementById('encounter-status'),
  lastSynced: document.getElementById('encounter-last-synced'),
  syncBtn: document.getElementById('load-open5e'),
  critterInput: document.getElementById('critterdb-url'),
  critterBtn: document.getElementById('import-critterdb'),
  importMsg: document.getElementById('critterdb-message'),
  search: document.getElementById('filter-search'),
  crMin: document.getElementById('filter-cr-min'),
  crMax: document.getElementById('filter-cr-max'),
  type: document.getElementById('filter-type'),
  alignment: document.getElementById('filter-alignment'),
  source: document.getElementById('filter-source'),
  partyRows: document.getElementById('encounter-party-rows'),
  addChar: document.getElementById('encounter-add-character'),
  difficulty: document.getElementById('encounter-difficulty'),
  generateBtn: document.getElementById('encounter-generate'),
  budget: document.getElementById('encounter-budget'),
  generatedBody: document.getElementById('encounter-generated-body'),
  generatedTotal: document.getElementById('encounter-generated-total'),
};

if (els.tbody) {
  init().catch((err) => setMessage(els.importMsg, err.message, 'error'));
}

async function init() {
  state.monsters = await getAllMonsters();
  repaint();
  renderLastSynced();
  wireEvents();
  ensurePartyRows();
  maybeBackgroundSyncOpen5e();
}

function wireEvents() {
  [els.search, els.crMin, els.crMax, els.type, els.alignment, els.source].forEach((el) => {
    el?.addEventListener('input', updateFilters);
    el?.addEventListener('change', updateFilters);
  });

  els.syncBtn?.addEventListener('click', () => backgroundSyncOpen5e(true));
  els.addChar?.addEventListener('click', () => addPartyRow(1));
  els.difficulty?.addEventListener('change', updateBudgetOnly);
  els.generateBtn?.addEventListener('click', generateEncounter);
  els.critterBtn?.addEventListener('click', async () => {
    const url = els.critterInput.value.trim();
    if (!url) return setMessage(els.importMsg, 'Please paste a CritterDB URL.', 'warning');
    setMessage(els.importMsg, 'Importing CritterDB...', 'warning');
    try {
      const imported = await importCritterDbMonsters(url);
      await upsertMonsters(imported);
      state.monsters = await getAllMonsters();
      repaint();
      setMessage(els.importMsg, `Imported ${imported.length} monsters from CritterDB.`, 'success');
    } catch (err) {
      setMessage(els.importMsg, `Import failed: ${err.message}`, 'error');
    }
  });
}

function ensurePartyRows() { if (!els.partyRows?.children.length) addPartyRow(1); }
function addPartyRow(level) {
  const row = document.createElement('div');
  row.className = 'encounter-party-row';
  row.innerHTML = `<label>Level <input type="number" min="1" max="20" value="${level}" class="encounter-party-level" /></label><button type="button" class="btn ghost">Remove</button>`;
  row.querySelector('input')?.addEventListener('input', updateBudgetOnly);
  row.querySelector('button')?.addEventListener('click', () => { row.remove(); updateBudgetOnly(); });
  els.partyRows?.appendChild(row);
  updateBudgetOnly();
}
function getPartyLevels() {
  return [...(els.partyRows?.querySelectorAll('.encounter-party-level') || [])]
    .map((el) => Math.max(1, Math.min(20, Number(el.value) || 1)));
}
function computeBudget() {
  const diff = els.difficulty?.value || 'moderate';
  return getPartyLevels().reduce((sum, lvl) => sum + (XP_BUDGETS_BY_LEVEL[lvl]?.[diff] || 0), 0);
}
function updateBudgetOnly() {
  const budget = computeBudget();
  if (els.budget) els.budget.textContent = `${budget.toLocaleString()} XP target`;
}
function monsterXp(monster) {
  if (monster.cr === null || monster.cr === undefined || monster.cr === '') return 0;
  const crString = String(monster.cr).trim();
  return XP_BY_CR[crString] ?? XP_BY_CR[String(Number(crString))] ?? 0;
}
function generateEncounter() {
  const budget = computeBudget();
  const pool = state.monsters
    .map((m) => ({ ...m, xp: monsterXp(m) }))
    .filter((m) => m.xp > 0 && m.xp <= budget);
  let remaining = budget;
  const chosen = [];

  // Randomized selection so repeated Generate clicks produce different mixes.
  for (let attempts = 0; attempts < 200 && chosen.length < 20; attempts += 1) {
    const candidates = pool.filter((monster) => monster.xp <= remaining);
    if (!candidates.length) break;
    const picked = candidates[Math.floor(Math.random() * candidates.length)];
    chosen.push(picked);
    remaining -= picked.xp;
    if (remaining <= budget * 0.05) break;
  }

  // If random picks left too much budget, top off with best-fit random candidates.
  for (let attempts = 0; attempts < 100 && remaining > 0 && chosen.length < 20; attempts += 1) {
    const candidates = pool.filter((monster) => monster.xp <= remaining);
    if (!candidates.length) break;
    const bestXp = Math.max(...candidates.map((monster) => monster.xp));
    const nearBest = candidates.filter((monster) => monster.xp >= bestXp * 0.7);
    const picked = nearBest[Math.floor(Math.random() * nearBest.length)];
    chosen.push(picked);
    remaining -= picked.xp;
  }

  renderMonsterTable(els.generatedBody, chosen.map((m) => ({ ...m, source: `${m.source || m.origin} • ${m.xp} XP` })));
  const used = budget - remaining;
  if (els.generatedTotal) els.generatedTotal.textContent = `Generated ${chosen.length} monsters • ${used.toLocaleString()} / ${budget.toLocaleString()} XP`;
}

function updateFilters() { /* unchanged */
  state.filters = {
    search: els.search.value, crMin: els.crMin.value, crMax: els.crMax.value,
    type: els.type.value, alignment: els.alignment.value, source: els.source.value,
  };
  repaintTableOnly();
}
function repaint() {
  const { types, sources } = buildFilters(state.monsters);
  syncOptions(els.type, types); syncOptions(els.source, sources); repaintTableOnly(); updateBudgetOnly();
}
function repaintTableOnly() {
  const filtered = applyFilters(state.monsters, state.filters);
  renderMonsterTable(els.tbody, filtered);
  els.status.textContent = `${filtered.length} monsters shown (${state.monsters.length} total cached).`;
}
function syncOptions(select, values) {
  if (!select) return; const current = select.value; select.innerHTML = '<option value="">Any</option>';
  for (const value of values) { const option = document.createElement('option'); option.value = value; option.textContent = value; select.appendChild(option); }
  select.value = current;
}
function shouldAutoSyncOpen5e() {
  const metaRaw = localStorage.getItem(CACHE_META_KEY); if (!metaRaw) return true;
  try { const meta = JSON.parse(metaRaw); if (!meta.lastSyncedAt) return true; return Date.now() - meta.lastSyncedAt > OPEN5E_REFRESH_MS; } catch { return true; }
}
function setOpen5eSyncMeta(count) { localStorage.setItem(CACHE_META_KEY, JSON.stringify({ lastSyncedAt: Date.now(), count })); renderLastSynced(); }
function renderLastSynced() {
  const raw = localStorage.getItem(CACHE_META_KEY);
  if (!els.lastSynced) return;
  if (!raw) { els.lastSynced.textContent = 'Last synced: never'; return; }
  try {
    const meta = JSON.parse(raw);
    els.lastSynced.textContent = meta.lastSyncedAt ? `Last synced: ${new Date(meta.lastSyncedAt).toLocaleString()}` : 'Last synced: never';
  } catch { els.lastSynced.textContent = 'Last synced: unknown'; }
}
function maybeBackgroundSyncOpen5e() {
  if (!shouldAutoSyncOpen5e()) { els.status.textContent = `Using cached data (${state.monsters.length} monsters).`; return; }
  backgroundSyncOpen5e(false);
}
async function backgroundSyncOpen5e(force) {
  if (els.syncBtn) els.syncBtn.disabled = true;
  if (!force) els.status.textContent = `Background sync started...`;
  try {
    const monsters = await fetchAllOpen5eMonsters((msg) => { els.status.textContent = msg; });
    await replaceOriginMonsters('open5e', monsters);
    setOpen5eSyncMeta(monsters.length);
    state.monsters = await getAllMonsters();
    repaint();
  } catch (err) { setMessage(els.importMsg, `Open5e sync failed: ${err.message}`, 'error'); }
  finally { if (els.syncBtn) els.syncBtn.disabled = false; }
}
