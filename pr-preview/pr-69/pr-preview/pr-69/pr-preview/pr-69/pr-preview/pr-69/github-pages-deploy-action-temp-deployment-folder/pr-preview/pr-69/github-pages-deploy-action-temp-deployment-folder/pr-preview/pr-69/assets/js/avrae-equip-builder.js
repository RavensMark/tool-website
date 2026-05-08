(function () {
  var root = document.getElementById('panel-avrae-equip');
  var form = document.getElementById('avrae-equip-form');
  var output = document.getElementById('avrae-equip-output');
  var weaponSelect = document.getElementById('avrae-equip-weapon');
  var advancedToggle = document.getElementById('avrae-equip-advanced-toggle');

  if (!root || !form || !output || !weaponSelect) return;

  var basicWeapons = [
    'club', 'dagger', 'greatclub', 'handaxe', 'javelin', 'light hammer', 'mace', 'quarterstaff', 'sickle', 'spear',
    'light crossbow', 'dart', 'shortbow', 'sling',
    'battleaxe', 'flail', 'glaive', 'greataxe', 'greatsword', 'halberd', 'lance', 'longsword', 'maul', 'morningstar',
    'pike', 'rapier', 'scimitar', 'shortsword', 'trident', 'war pick', 'warhammer', 'whip',
    'blowgun', 'hand crossbow', 'heavy crossbow', 'longbow', 'net'
  ];

  basicWeapons.forEach(function (weapon) {
    var opt = document.createElement('option');
    opt.value = weapon;
    opt.textContent = weapon;
    weaponSelect.appendChild(opt);
  });

  function clean(value) {
    return String(value || '').trim();
  }

  function quoteIfNeeded(text) {
    if (!text) return '';
    return /\s/.test(text) ? '"' + text + '"' : text;
  }

  function addFlag(parts, id, name) {
    var el = document.getElementById(id);
    if (el && el.checked) parts.push(name);
  }

  function addValueFlag(parts, id, flag, quote) {
    var el = document.getElementById(id);
    if (!el) return;
    var value = clean(el.value);
    if (!value) return;
    parts.push(flag + ' ' + (quote ? quoteIfNeeded(value) : value));
  }

  function build() {
    var parts = ['!equip'];
    var weapon = clean(weaponSelect.value);
    if (weapon) parts.push(quoteIfNeeded(weapon));

    addValueFlag(parts, 'avrae-equip-bonus-hit', '-b');
    addValueFlag(parts, 'avrae-equip-bonus-dmg', '-d');
    addFlag(parts, 'avrae-equip-nodmg', 'nodmg');
    addValueFlag(parts, 'avrae-equip-name', '-name', true);
    addValueFlag(parts, 'avrae-equip-stat', '-stat');
    addValueFlag(parts, 'avrae-equip-target', '-t', true);

    addFlag(parts, 'avrae-equip-magical', 'magical');
    addFlag(parts, 'avrae-equip-adamantine', 'adamantine');
    addFlag(parts, 'avrae-equip-silvered', 'silvered');
    addFlag(parts, 'avrae-equip-monk', 'monk');
    addFlag(parts, 'avrae-equip-2h', '2h');
    addFlag(parts, 'avrae-equip-off', 'off');
    addFlag(parts, 'avrae-equip-savage', 'savage');

    addValueFlag(parts, 'avrae-equip-verb', '-verb', true);
    addFlag(parts, 'avrae-equip-proper', 'proper');
    addValueFlag(parts, 'avrae-equip-criton', '-criton');
    addValueFlag(parts, 'avrae-equip-crit-extra', '-c');

    addFlag(parts, 'avrae-equip-archery', 'archery');
    addFlag(parts, 'avrae-equip-dueling', 'dueling');
    addFlag(parts, 'avrae-equip-gwf', 'gwf');

    output.value = parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  function updateAdvancedState() {
    root.classList.toggle('show-advanced-equip', !!advancedToggle.checked);
  }

  form.addEventListener('input', build);
  form.addEventListener('change', build);
  if (advancedToggle) {
    advancedToggle.addEventListener('change', updateAdvancedState);
  }
  updateAdvancedState();
  build();
})();
