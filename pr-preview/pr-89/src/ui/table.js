export function renderMonsterTable(tbody, monsters, options = {}) {
  const { actionLabel, onAction } = options;
  const fragment = document.createDocumentFragment();

  for (const m of monsters) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${m.name}</td><td>${m.cr ?? ''}</td><td>${m.type ?? ''}</td><td>${m.alignment ?? ''}</td><td>${m.source ?? m.origin}</td>`;

    if (actionLabel && typeof onAction === 'function') {
      const actionTd = document.createElement('td');
      const actionBtn = document.createElement('button');
      actionBtn.type = 'button';
      actionBtn.className = 'btn ghost';
      actionBtn.textContent = actionLabel;
      actionBtn.addEventListener('click', () => onAction(m));
      actionTd.appendChild(actionBtn);
      tr.appendChild(actionTd);
    }

    fragment.appendChild(tr);
  }

  tbody.replaceChildren(fragment);
}
