(function () {
  var outputWrap = document.getElementById('avrae-use-builder');
  var root = document.getElementById('panel-avrae-use');
  if (!outputWrap || !root) return;

  var output = document.getElementById('avrae-use-output');
  var form = document.getElementById('avrae-use-form');
  var targetsWrap = document.getElementById('avrae-use-targets');
  var addTargetBtn = document.getElementById('avrae-use-add-target');
  var advancedToggle = document.getElementById('avrae-use-advanced-toggle');

  function q(id) {
    return document.getElementById(id);
  }

  function clean(value) {
    return String(value || '').trim();
  }

  function asFlagOrValue(flag, value) {
    var v = clean(value);
    if (!v) return '';
    return flag + ' ' + v;
  }

  function makeTargetRow() {
    var row = document.createElement('div');
    row.className = 'avrae-use-target-row';
    row.innerHTML = [
      '<input type="text" class="avrae-use-target-name" placeholder="Target name (e.g. OR1)" />',
      '<input type="text" class="avrae-use-target-args" placeholder="Target args (optional, e.g. pass half)" />',
      '<button type="button" class="btn ghost avrae-use-target-remove">Remove</button>'
    ].join('');
    return row;
  }

  function appendTargetRow() {
    targetsWrap.appendChild(makeTargetRow());
  }

  function collectTargets(parts) {
    var all = q('avrae-use-target-all').checked;
    var noSelf = q('avrae-use-target-noself').checked;

    if (all) parts.push('all');

    var rows = targetsWrap.querySelectorAll('.avrae-use-target-row');
    rows.forEach(function (row) {
      var name = clean(row.querySelector('.avrae-use-target-name').value);
      var args = clean(row.querySelector('.avrae-use-target-args').value);
      if (!name) return;
      if (args) {
        parts.push('-t "' + name + '|' + args + '"');
      } else {
        parts.push('-t "' + name + '"');
      }
    });

    if (noSelf) parts.push('noself');
  }

  function updateTargetDisableState() {
    var disabled = q('avrae-use-target-all').checked;
    targetsWrap.querySelectorAll('input, button').forEach(function (el) {
      el.disabled = disabled;
    });
    addTargetBtn.disabled = disabled;
  }

  function updateAdvancedState() {
    root.classList.toggle('show-advanced', !!advancedToggle.checked);
  }

  function collectCheckboxGroup(selector, parts) {
    outputWrap.querySelectorAll(selector + ':checked').forEach(function (el) {
      var val = clean(el.value);
      if (val) parts.push(val);
    });
  }

  function build() {
    var parts = ['!use'];

    parts.push(asFlagOrValue('-save', q('avrae-use-save').value.toLowerCase()));
    parts.push(asFlagOrValue('-dc', q('avrae-use-dc').value));

    var rollmod = clean(q('avrae-use-rollmod').value);
    if (rollmod) parts.push(rollmod);
    if (q('avrae-use-hide').checked) parts.push('-h');

    collectTargets(parts);

    var bonus = clean(q('avrae-use-bonus').value);
    if (bonus) parts.push('-b ' + bonus);

    var damage = clean(q('avrae-use-damage').value);
    var damageMin = clean(q('avrae-use-dmg-min').value);
    var damageMax = clean(q('avrae-use-dmg-max').value);
    if (damage) {
      if (damageMin || damageMax) {
        parts.push('-d "' + damage + '|' + damageMin + '|' + damageMax + '"');
      } else {
        parts.push('-d ' + damage);
      }
    }

    collectCheckboxGroup('input[name="avrae-use-dmgmods"]', parts);

    parts.push(asFlagOrValue('-effect', q('avrae-use-effect').value));
    parts.push(asFlagOrValue('-effectdesc', q('avrae-use-effectdesc').value));
    parts.push(asFlagOrValue('-seffect', q('avrae-use-seffect').value));
    parts.push(asFlagOrValue('-seffectdesc', q('avrae-use-seffectdesc').value));
    parts.push(asFlagOrValue('-user', q('avrae-use-user').value));

    parts.push(asFlagOrValue('-cc', q('avrae-use-cc').value));
    parts.push(asFlagOrValue('-ccnum', q('avrae-use-ccnum').value));
    parts.push(asFlagOrValue('-slot', q('avrae-use-slot').value));
    parts.push(asFlagOrValue('-slotnum', q('avrae-use-slotnum').value));
    parts.push(asFlagOrValue('-item', q('avrae-use-item').value));
    parts.push(asFlagOrValue('-itemqty', q('avrae-use-itemqty').value));
    if (q('avrae-use-i').checked) parts.push('-i');

    parts.push(asFlagOrValue('-title', q('avrae-use-title').value));
    parts.push(asFlagOrValue('-phrase', q('avrae-use-phrase').value));
    parts.push(asFlagOrValue('-desc', q('avrae-use-desc').value));
    parts.push(asFlagOrValue('-thumb', q('avrae-use-thumb').value));
    parts.push(asFlagOrValue('-image', q('avrae-use-image').value));
    parts.push(asFlagOrValue('-color', q('avrae-use-color').value));
    parts.push(asFlagOrValue('-roll', q('avrae-use-roll').value));
    parts.push(asFlagOrValue('-n', q('avrae-use-n').value));
    parts.push(asFlagOrValue('-ndesc', q('avrae-use-ndesc').value));

    parts.push(asFlagOrValue('-cvar', q('avrae-use-cvar').value));
    parts.push(asFlagOrValue('-out', q('avrae-use-out').value));

    output.value = parts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
  }

  addTargetBtn.addEventListener('click', appendTargetRow);
  q('avrae-use-target-all').addEventListener('change', function () {
    updateTargetDisableState();
    build();
  });
  if (advancedToggle) {
    advancedToggle.addEventListener('change', updateAdvancedState);
  }

  targetsWrap.addEventListener('click', function (ev) {
    var btn = ev.target.closest('.avrae-use-target-remove');
    if (!btn) return;
    var rows = targetsWrap.querySelectorAll('.avrae-use-target-row');
    if (rows.length <= 1) {
      rows[0].querySelector('.avrae-use-target-name').value = '';
      rows[0].querySelector('.avrae-use-target-args').value = '';
      build();
      return;
    }
    btn.closest('.avrae-use-target-row').remove();
    build();
  });

  form.addEventListener('input', build);
  form.addEventListener('change', build);

  appendTargetRow();
  updateTargetDisableState();
  updateAdvancedState();
  build();
})();
