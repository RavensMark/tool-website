(function () {
  var STATS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'];
  var POINT_COST = { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 };
  var CLASS_DIE = { Artificer: 8, Barbarian: 12, Bard: 8, Cleric: 8, Druid: 8, Fighter: 10, Monk: 8, Paladin: 10, Ranger: 10, Rogue: 8, Sorcerer: 6, Warlock: 8, Wizard: 6 };

  var statsGrid = document.getElementById('cc-stats-grid');
  if (!statsGrid) return;

  var asiDialog = document.getElementById('cc-asi-dialog');
  var asiControls = document.getElementById('cc-asi-controls');
  var asiSummary = document.getElementById('cc-asi-summary');
  var ngPlus = document.getElementById('cc-ngplus');
  var pointTotal = document.getElementById('cc-point-total');
  var pointLimit = document.getElementById('cc-point-limit');
  var classesWrap = document.getElementById('cc-classes');
  var hpTotal = document.getElementById('cc-hp-total');
  var markdownOutput = document.getElementById('cc-markdown-output');

  var asiValues = {};
  var classRows = [];

  STATS.forEach(function (stat) {
    asiValues[stat] = 0;
    var field = document.createElement('label');
    field.className = 'field';
    field.innerHTML = '<span>' + stat + '</span><input type="number" min="8" max="15" step="1" value="8" data-stat="' + stat + '" /><small id="cc-mod-' + stat + '">-1</small>';
    statsGrid.appendChild(field);
  });

  STATS.forEach(function (stat) {
    var row = document.createElement('label');
    row.className = 'field';
    row.innerHTML = '<span>' + stat + ' ASI (+0 to +3)</span><input type="number" min="0" max="3" step="1" value="0" data-asi-stat="' + stat + '" />';
    asiControls.appendChild(row);
  });

  function fixedAverage(die) {
    return Math.floor(die / 2) + 1;
  }

  function statMod(score) {
    return Math.floor((score - 10) / 2);
  }

  function getConMod() {
    var conInput = statsGrid.querySelector('input[data-stat="CON"]');
    return statMod(Number(conInput.value || 8));
  }

  function refreshPointBuy() {
    var total = 0;
    var asiTotal = 0;
    var asiText = [];

    STATS.forEach(function (stat) {
      var statInput = statsGrid.querySelector('input[data-stat="' + stat + '"]');
      var raw = Number(statInput.value || 8);
      var score = Math.max(8, Math.min(15, raw));
      statInput.value = score;
      total += POINT_COST[score] || 0;
      var mod = statMod(score);
      document.getElementById('cc-mod-' + stat).textContent = (mod >= 0 ? '+' : '') + mod;

      asiTotal += asiValues[stat] || 0;
      if (asiValues[stat]) asiText.push(stat + ' +' + asiValues[stat]);
    });

    var finalTotal = total - asiTotal;
    var limit = ngPlus.checked ? 30 : 27;
    pointLimit.textContent = String(limit);
    pointTotal.textContent = String(finalTotal);
    pointTotal.style.color = finalTotal > limit ? 'var(--danger)' : 'var(--parchment)';
    asiSummary.textContent = asiText.length ? ('ASIs selected: ' + asiText.join(', ')) : 'No ASIs selected.';
    refreshMarkdown();
  }

  function refreshHp() {
    var totalLevels = 0;
    var totalHp = 0;
    var conMod = getConMod();

    classRows.forEach(function (row, idx) {
      var className = row.classSelect.value;
      var levels = Math.max(0, Number(row.levelInput.value || 0));
      row.levelInput.value = levels;
      if (!levels) return;
      var die = Number(className);
      if (idx === 0) {
        totalHp += die + conMod;
        if (levels > 1) totalHp += (levels - 1) * (fixedAverage(die) + conMod);
      } else {
        totalHp += levels * (fixedAverage(die) + conMod);
      }
      totalLevels += levels;
    });

    if (document.getElementById('cc-tough').checked) totalHp += totalLevels * 2;
    hpTotal.textContent = String(Math.max(0, totalHp));
    refreshMarkdown();
  }

  function checkMark(id) {
    var box = document.getElementById(id);
    return box && box.checked ? '✔' : '✘';
  }

  function classSummary() {
    var parts = [];
    classRows.forEach(function (row) {
      var levels = Math.max(0, Number(row.levelInput.value || 0));
      if (!levels) return;
      var label = row.classSelect.options[row.classSelect.selectedIndex].textContent;
      var className = label.split(' (')[0];
      parts.push(className + ' ' + levels);
    });
    return parts.length ? parts.join('/') : 'None';
  }

  function refreshMarkdown() {
    if (!markdownOutput) return;
    var pointValue = Number(pointTotal.textContent || 0);
    var pointCap = Number(pointLimit.textContent || 27);
    var hpValue = Number(hpTotal.textContent || 0);
    var ng = ngPlus.checked ? 'TRUE' : 'FALSE';
    var tough = document.getElementById('cc-tough').checked ? 'TRUE' : 'FALSE';
    var pointMark = pointValue <= pointCap ? '✔' : '✘';

    markdownOutput.value = [
      'Classes: ' + classSummary(),
      '- [' + pointMark + '] Point Buy: ' + pointValue + '/' + pointCap + ' [NG+: ' + ng + ']',
      '- [' + checkMark('cc-check-health-match') + '] Health: ' + hpValue + '/' + hpValue + ' [Tough: ' + tough + ']',
      '- [' + checkMark('cc-check-class') + '] Approved Class',
      '- [' + checkMark('cc-check-species') + '] Approved Species',
      '- [' + checkMark('cc-check-language') + '] Approved Language',
      '- [' + checkMark('cc-check-feat') + '] Taken Feat',
      '- [' + checkMark('cc-check-potion') + '] Taken Potion',
      '- [' + checkMark('cc-check-backstory') + '] Rough Backstory'
    ].join('\n');
  }

  function addClassRow() {
    var row = document.createElement('div');
    row.className = 'character-class-row';
    var select = document.createElement('select');
    Object.keys(CLASS_DIE).forEach(function (name) {
      var opt = document.createElement('option');
      opt.value = String(CLASS_DIE[name]);
      opt.textContent = name + ' (d' + CLASS_DIE[name] + ')';
      select.appendChild(opt);
    });
    var levelInput = document.createElement('input');
    levelInput.type = 'number';
    levelInput.min = '0';
    levelInput.step = '1';
    levelInput.value = '1';
    levelInput.placeholder = 'Levels';
    var remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'btn ghost';
    remove.textContent = 'Remove';

    row.appendChild(select);
    row.appendChild(levelInput);
    row.appendChild(remove);
    classesWrap.appendChild(row);

    var info = { row: row, classSelect: select, levelInput: levelInput };
    classRows.push(info);

    select.addEventListener('change', refreshHp);
    levelInput.addEventListener('input', refreshHp);
    remove.addEventListener('click', function () {
      classRows = classRows.filter(function (entry) { return entry !== info; });
      row.remove();
      refreshHp();
    });
    refreshHp();
  }

  statsGrid.addEventListener('input', function (event) {
    if (event.target.matches('input[data-stat]')) {
      refreshPointBuy();
      refreshHp();
    }
  });

  asiControls.addEventListener('input', function (event) {
    if (!event.target.matches('input[data-asi-stat]')) return;
    var stat = event.target.getAttribute('data-asi-stat');
    var value = Math.max(0, Math.min(3, Number(event.target.value || 0)));
    event.target.value = value;
    asiValues[stat] = value;
    refreshPointBuy();
  });

  document.getElementById('cc-open-asi').addEventListener('click', function () {
    asiDialog.showModal();
  });
  document.getElementById('cc-asi-reset').addEventListener('click', function () {
    STATS.forEach(function (stat) {
      asiValues[stat] = 0;
      var input = asiControls.querySelector('input[data-asi-stat="' + stat + '"]');
      input.value = '0';
    });
    refreshPointBuy();
  });
  ngPlus.addEventListener('change', refreshPointBuy);
  document.getElementById('cc-add-class').addEventListener('click', addClassRow);
  document.getElementById('cc-tough').addEventListener('change', refreshHp);
  document.querySelectorAll('#panel-character .character-checklist input[type="checkbox"]').forEach(function (box) {
    box.addEventListener('change', refreshMarkdown);
  });

  addClassRow();
  refreshPointBuy();
  refreshMarkdown();
})();
