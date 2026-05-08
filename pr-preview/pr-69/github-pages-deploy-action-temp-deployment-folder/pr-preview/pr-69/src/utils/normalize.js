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

function normalizeType(typeValue) {
  if (!typeValue) return null;
  if (typeof typeValue === 'string') return typeValue.trim().toLowerCase();
  if (typeof typeValue === 'object') {
    const raw = typeValue.type || typeValue.name || typeValue.value || null;
    return raw ? String(raw).trim().toLowerCase() : null;
  }
  return String(typeValue).trim().toLowerCase();
}

function normalizeAlignment(alignmentValue) {
  if (!alignmentValue) return null;
  if (typeof alignmentValue === 'string') return alignmentValue.trim();
  if (Array.isArray(alignmentValue)) return alignmentValue.map((item) => String(item)).join(', ');
  if (typeof alignmentValue === 'object') {
    const raw = alignmentValue.name || alignmentValue.value || null;
    return raw ? String(raw).trim() : null;
  }
  return String(alignmentValue).trim();
}

export function normalizeMonster(raw, origin) {
  const name = String(raw.name || '').trim();
  const type = normalizeType(raw.type);
  const alignment = normalizeAlignment(raw.alignment);
  const source = raw.source ? String(raw.source).trim() : null;
  const cr = parseCr(raw.cr);
  const id = `${origin}:${name.toLowerCase().replace(/\s+/g, '-')}:${String(cr)}:${type || 'none'}`;
  return { id, name, cr, type, alignment, source, origin };
}

export function dedupeKey(monster) {
  return `${monster.name.trim().toLowerCase()}|${String(parseCr(monster.cr))}|${(monster.type || '').toLowerCase()}`;
}
