export function renderMonsterTable(tbody, monsters) {
  const fragment = document.createDocumentFragment();
  for (const m of monsters) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${m.name}</td><td>${m.cr ?? ''}</td><td>${m.type ?? ''}</td><td>${m.alignment ?? ''}</td><td>${m.source ?? m.origin}</td>`;
    fragment.appendChild(tr);
  }
  tbody.replaceChildren(fragment);
}
