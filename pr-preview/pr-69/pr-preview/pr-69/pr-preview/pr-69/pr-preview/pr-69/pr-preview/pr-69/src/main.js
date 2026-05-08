import { fetchAllOpen5eMonsters } from './api/open5e.js';
import { importCritterDbMonsters } from './api/critterdb.js';
import { getAllMonsters, upsertMonsters } from './db/indexeddb.js';
import { buildFilters, applyFilters } from './ui/filters.js';
import { renderMonsterTable } from './ui/table.js';
import { setMessage } from './ui/importPanel.js';

const CACHE_META_KEY = 'rm-encounter-open5e-meta-v1';
const OPEN5E_REFRESH_MS = 1000 * 60 * 60 * 24 * 7;

const state = { monsters: [], filters: { search: '', crMin: '', crMax: '', type: '', alignment: '', source: '' } };

const els = {
  tbody: document.getElementById('encounter-monsters-body'),
  status: document.getElementById('encounter-status'),
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
};

if (els.tbody) {
  init().catch((err) => setMessage(els.importMsg, err.message, 'error'));
}

async function init() {
  state.monsters = await getAllMonsters();
  repaint();
  wireEvents();
  maybeBackgroundSyncOpen5e();
}

function wireEvents() {
  [els.search, els.crMin, els.crMax, els.type, els.alignment, els.source].forEach((el) => {
    el?.addEventListener('input', updateFilters);
    el?.addEventListener('change', updateFilters);
  });

  els.syncBtn?.addEventListener('click', () => backgroundSyncOpen5e(true));
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

function updateFilters() {
  state.filters = {
    search: els.search.value,
    crMin: els.crMin.value,
    crMax: els.crMax.value,
    type: els.type.value,
    alignment: els.alignment.value,
    source: els.source.value,
  };
  repaintTableOnly();
}

function repaint() {
  const { types, sources } = buildFilters(state.monsters);
  syncOptions(els.type, types);
  syncOptions(els.source, sources);
  repaintTableOnly();
}

function repaintTableOnly() {
  const filtered = applyFilters(state.monsters, state.filters);
  renderMonsterTable(els.tbody, filtered);
  els.status.textContent = `${filtered.length} monsters shown (${state.monsters.length} total cached).`;
}

function syncOptions(select, values) {
  if (!select) return;
  const current = select.value;
  select.innerHTML = '<option value="">Any</option>';
  for (const value of values) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  }
  select.value = current;
}

function shouldAutoSyncOpen5e() {
  const metaRaw = localStorage.getItem(CACHE_META_KEY);
  if (!metaRaw) return true;
  try {
    const meta = JSON.parse(metaRaw);
    if (!meta.lastSyncedAt) return true;
    return Date.now() - meta.lastSyncedAt > OPEN5E_REFRESH_MS;
  } catch {
    return true;
  }
}

function setOpen5eSyncMeta(count) {
  localStorage.setItem(CACHE_META_KEY, JSON.stringify({ lastSyncedAt: Date.now(), count }));
}

function maybeBackgroundSyncOpen5e() {
  if (!shouldAutoSyncOpen5e()) {
    els.status.textContent = `Using cached data (${state.monsters.length} monsters).`;
    return;
  }
  backgroundSyncOpen5e(false);
}

async function backgroundSyncOpen5e(force) {
  if (els.syncBtn) els.syncBtn.disabled = true;
  if (!force) {
    els.status.textContent = `Background sync started...`;
  }
  try {
    const monsters = await fetchAllOpen5eMonsters((msg) => {
      els.status.textContent = msg;
    });
    await upsertMonsters(monsters);
    setOpen5eSyncMeta(monsters.length);
    state.monsters = await getAllMonsters();
    repaint();
  } catch (err) {
    setMessage(els.importMsg, `Open5e sync failed: ${err.message}`, 'error');
  } finally {
    if (els.syncBtn) els.syncBtn.disabled = false;
  }
}
