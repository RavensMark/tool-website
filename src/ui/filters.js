export function buildFilters(monsters) {
  const types = [...new Set(monsters.map((m) => m.type).filter(Boolean))].sort();
  const sources = [...new Set(monsters.map((m) => m.origin).filter(Boolean))].sort();
  return { types, sources };
}

export function applyFilters(monsters, state) {
  const search = state.search.trim().toLowerCase();
  return monsters.filter((m) => {
    if (search && !m.name.toLowerCase().includes(search)) return false;
    if (state.type && m.type !== state.type) return false;
    if (state.sources?.length && !state.sources.includes(m.origin)) return false;
    if (state.alignment && !(m.alignment || '').toLowerCase().includes(state.alignment.toLowerCase())) return false;
    if (state.crMin !== '' || state.crMax !== '') {
      const crValue = typeof m.cr === 'number' ? m.cr : Number(m.cr);
      if (!Number.isNaN(crValue)) {
        if (state.crMin !== '' && crValue < Number(state.crMin)) return false;
        if (state.crMax !== '' && crValue > Number(state.crMax)) return false;
      }
    }
    return true;
  });
}
