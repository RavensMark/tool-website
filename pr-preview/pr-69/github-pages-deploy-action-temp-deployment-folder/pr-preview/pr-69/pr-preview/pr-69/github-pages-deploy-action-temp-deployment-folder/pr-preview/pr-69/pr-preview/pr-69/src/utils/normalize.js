function parseCr(cr) {
  if (cr === null || cr === undefined || cr === '') return null;
  if (typeof cr === 'number') return cr;
  const value = String(cr).trim();
  if (value.includes('/')) {
    const [a, b] = value.split('/').map(Number);
    if (!Number.isNaN(a) && !Number.isNaN(b) && b !== 0) return a / b;
  }
  const numeric = Number(value);
  return Number.isNaN(numeric) ? value : numeric;
}

export function normalizeMonster(raw, origin) {
  const name = String(raw.name || '').trim();
  const type = raw.type ? String(raw.type).trim().toLowerCase() : null;
  const alignment = raw.alignment ? String(raw.alignment).trim() : null;
  const source = raw.source ? String(raw.source).trim() : null;
  const cr = parseCr(raw.cr);
  const id = `${origin}:${name.toLowerCase().replace(/\s+/g, '-')}:${String(cr)}:${type || 'none'}`;
  return { id, name, cr, type, alignment, source, origin };
}

export function dedupeKey(monster) {
  return `${monster.name.trim().toLowerCase()}|${String(parseCr(monster.cr))}|${(monster.type || '').toLowerCase()}`;
}
