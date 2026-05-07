(function () {
  /**
   * Resolve repo root for fetch(). A bare path like "data/…" is resolved against the *page* URL.
   * On GitHub Pages, https://user.github.io/repo-name (no trailing slash) would wrongly request
   * https://user.github.io/data/… instead of …/repo-name/data/…
   */
  function appBaseHref() {
    var marker = "assets/js/questinfo.js";
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src || "";
      if (src.indexOf(marker) !== -1) {
        try {
          return new URL("../..", src).href;
        } catch (e) {}
      }
    }
    try {
      return new URL("./", window.location.href).href;
    } catch (e2) {
      return "";
    }
  }

  var CSV_URL = (function () {
    try {
      return new URL("data/content-warnings.csv", appBaseHref()).href;
    } catch (e) {
      return "data/content-warnings.csv";
    }
  })();

  var RANKS = [
    { id: "hatchling", label: "Hatchling" },
    { id: "chickling", label: "Chickling" },
    { id: "fledgeling", label: "Fledgeling" },
    { id: "flier", label: "Flier" },
    { id: "soarer", label: "Soarer" },
    { id: "elder", label: "Elder" },
  ];

  var TYPES = [
    { id: "rp", label: "RP" },
    { id: "combat", label: "Combat" },
    { id: "puzzle", label: "Puzzle" },
    { id: "exploration", label: "Exploration" },
  ];

  var LENGTHS = [
    { id: "short", label: "Short" },
    { id: "medium", label: "Medium" },
    { id: "long", label: "Long" },
  ];

  var DIFFICULTIES = [
    { id: "easy", label: "Easy" },
    { id: "average", label: "Average" },
    { id: "hard", label: "Hard" },
    { id: "deadly", label: "Deadly" },
  ];

  var rankEl = document.getElementById("qi-rank");
  var typeEl = document.getElementById("qi-type");
  var lengthEl = document.getElementById("qi-length");
  var difficultyEl = document.getElementById("qi-difficulty");
  var cwListEl = document.getElementById("qi-cw-list");
  var cwFilterEl = document.getElementById("qi-cw-filter");
  var cwStatusEl = document.getElementById("qi-cw-status");
  var cwSelectVisibleBtn = document.getElementById("qi-cw-select-visible");
  var cwClearBtn = document.getElementById("qi-cw-clear");
  var inviteOnlyEl = document.getElementById("qi-invite-only");
  var questLineEl = document.getElementById("qi-quest-line");
  var mdOutEl = document.getElementById("qi-md-output");

  if (!rankEl || !mdOutEl) return;

  var state = {
    ranks: {},
    inviteOnly: false,
    questLine: "",
    types: {},
    length: "",
    difficulty: "",
    warnings: [],
    selectedCw: {},
    cwFilter: "",
    collapsedCwGroups: {},
  };

  TYPES.forEach(function (t) {
    state.types[t.id] = false;
  });
  RANKS.forEach(function (r) {
    state.ranks[r.id] = false;
  });

  function mdEscapeInline(s) {
    return String(s)
      .replace(/\\/g, "\\\\")
      .replace(/\*/g, "\\*")
      .replace(/_/g, "\\_")
      .replace(/`/g, "\\`");
  }

  function parseCsvLine(line) {
    var out = [];
    var cur = "";
    var inQuotes = false;
    for (var i = 0; i < line.length; i++) {
      var ch = line.charAt(i);
      if (ch === '"') {
        if (inQuotes && line.charAt(i + 1) === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  }

  function parseWarningCsv(text) {
    var lines = String(text).split(/\r?\n/);
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i];
      if (!raw) continue;
      var line = raw.trim();
      if (!line) continue;
      var cols = parseCsvLine(line);
      if (i === 0 && /^label$/i.test(cols[0])) continue;
      if (i === 0 && /^category$/i.test(cols[0]) && /^label$/i.test(cols[1] || "")) continue;
      var category = cols.length > 1 ? cols[0] || "General Distress & Other" : "General Distress & Other";
      var label = cols.length > 1 ? cols[1] : cols[0];
      if (!label) continue;
      out.push({ category: category, label: label });
    }
    return out;
  }

  function labelById(list, id) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id) return list[i].label;
    }
    return "";
  }

  function buildExclusiveGroup(container, items, current, onPick) {
    container.textContent = "";
    items.forEach(function (item) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn toggle";
      btn.textContent = item.label;
      btn.setAttribute("aria-pressed", current === item.id ? "true" : "false");
      btn.dataset.value = item.id;
      btn.addEventListener("click", function () {
        onPick(current === item.id ? "" : item.id);
      });
      container.appendChild(btn);
    });
  }

  function syncExclusiveButtons(container, current) {
    var btns = container.querySelectorAll("button[data-value]");
    btns.forEach(function (btn) {
      var on = btn.dataset.value === current;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function buildMultiGroup(container, items, valuesState, onToggle) {
    container.textContent = "";
    items.forEach(function (item) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn toggle";
      btn.textContent = item.label;
      var on = !!valuesState[item.id];
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      btn.dataset.value = item.id;
      btn.addEventListener("click", function () {
        onToggle(item.id);
      });
      container.appendChild(btn);
    });
  }

  function syncMultiGroup(container, valuesState) {
    var btns = container.querySelectorAll("button[data-value]");
    btns.forEach(function (btn) {
      var on = !!valuesState[btn.dataset.value];
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function selectedRankLabels() {
    var labels = [];
    RANKS.forEach(function (r) {
      if (state.ranks[r.id]) labels.push(r.label);
    });
    return labels;
  }

  function selectedTypeLabels() {
    var labels = [];
    TYPES.forEach(function (t) {
      if (state.types[t.id]) labels.push(t.label);
    });
    return labels;
  }

  function selectedWarningsSorted() {
    return state.warnings
      .filter(function (w) {
        return state.selectedCw[w.label];
      })
      .map(function (w) {
        return w.label;
      });
  }

  function renderMarkdown() {
    var lines = [];
    lines.push("## Quest Info");
    lines.push("");
    var ranks = selectedRankLabels();
    lines.push("**Rank:** " + (ranks.length ? ranks.join(", ") : "—"));
    lines.push("**Invite Only:** " + (state.inviteOnly ? "Yes" : "No"));
    lines.push("**Quest Line:** " + (state.questLine ? mdEscapeInline(state.questLine) : "—"));
    var t = selectedTypeLabels();
    lines.push("**Type:** " + (t.length ? t.join(", ") : "—"));
    lines.push("**Length:** " + (state.length ? labelById(LENGTHS, state.length) : "—"));
    lines.push("**Difficulty:** " + (state.difficulty ? labelById(DIFFICULTIES, state.difficulty) : "—"));
    lines.push("");
    var cw = selectedWarningsSorted();
    var warnings = "**Content warnings:** ";
    if (!cw.length) {
      warnings += "—";
    } else {
      cw.forEach(function (warning, idx) {
        warnings += (idx ? ", " : "") + mdEscapeInline(warning);
      });
    }
    lines.push(warnings);
    lines.push("");
    mdOutEl.value = lines.join("\n");
  }

  function cwMatchesFilter(warning) {
    var q = state.cwFilter.trim().toLowerCase();
    if (!q) return true;
    return (
      warning.label.toLowerCase().indexOf(q) !== -1 ||
      warning.category.toLowerCase().indexOf(q) !== -1
    );
  }

  function renderCwList() {
    if (!cwListEl) return;
    cwListEl.textContent = "";
    var frag = document.createDocumentFragment();
    var visible = 0;
    var grouped = {};

    state.warnings.forEach(function (warning) {
      if (!cwMatchesFilter(warning)) return;
      visible++;
      if (!grouped[warning.category]) grouped[warning.category] = [];
      grouped[warning.category].push(warning);
    });

    Object.keys(grouped).forEach(function (category) {
      var details = document.createElement("details");
      details.className = "questinfo-cw-group";
      details.open = !state.collapsedCwGroups[category];
      details.addEventListener("toggle", function () {
        state.collapsedCwGroups[category] = !details.open;
      });

      var summary = document.createElement("summary");
      summary.className = "questinfo-cw-group-title";
      summary.textContent = category + " (" + grouped[category].length + ")";
      details.appendChild(summary);

      grouped[category].forEach(function (warning) {
        var wrap = document.createElement("label");
        wrap.className = "questinfo-cw-item";
        var input = document.createElement("input");
        input.type = "checkbox";
        input.checked = !!state.selectedCw[warning.label];
        input.addEventListener("change", function () {
          if (input.checked) state.selectedCw[warning.label] = true;
          else delete state.selectedCw[warning.label];
          renderMarkdown();
        });
        var span = document.createElement("span");
        span.className = "questinfo-cw-text";
        span.textContent = warning.label;
        wrap.appendChild(input);
        wrap.appendChild(span);
        details.appendChild(wrap);
      });
      frag.appendChild(details);
    });

    cwListEl.appendChild(frag);
    if (cwStatusEl && state.warnings.length) {
      cwStatusEl.textContent =
        visible === state.warnings.length
          ? "Showing all " + state.warnings.length + " warnings."
          : "Showing " + visible + " of " + state.warnings.length + " warnings.";
    }
  }

  function setCwFilter(val) {
    state.cwFilter = val;
    renderCwList();
  }

  buildMultiGroup(rankEl, RANKS, state.ranks, function (id) {
    state.ranks[id] = !state.ranks[id];
    syncMultiGroup(rankEl, state.ranks);
    renderMarkdown();
  });

  buildExclusiveGroup(lengthEl, LENGTHS, state.length, function (next) {
    state.length = next;
    syncExclusiveButtons(lengthEl, state.length);
    renderMarkdown();
  });

  buildExclusiveGroup(difficultyEl, DIFFICULTIES, state.difficulty, function (next) {
    state.difficulty = next;
    syncExclusiveButtons(difficultyEl, state.difficulty);
    renderMarkdown();
  });

  buildMultiGroup(typeEl, TYPES, state.types, function (id) {
    state.types[id] = !state.types[id];
    syncMultiGroup(typeEl, state.types);
    renderMarkdown();
  });

  if (inviteOnlyEl) {
    inviteOnlyEl.addEventListener("change", function () {
      state.inviteOnly = !!inviteOnlyEl.checked;
      renderMarkdown();
    });
  }

  if (questLineEl) {
    questLineEl.addEventListener("input", function () {
      state.questLine = questLineEl.value.trim();
      renderMarkdown();
    });
  }

  if (cwFilterEl) {
    cwFilterEl.addEventListener("input", function () {
      setCwFilter(cwFilterEl.value);
    });
  }

  if (cwSelectVisibleBtn) {
    cwSelectVisibleBtn.addEventListener("click", function () {
      state.warnings.forEach(function (warning) {
        if (cwMatchesFilter(warning)) state.selectedCw[warning.label] = true;
      });
      renderCwList();
      renderMarkdown();
    });
  }

  if (cwClearBtn) {
    cwClearBtn.addEventListener("click", function () {
      state.selectedCw = {};
      renderCwList();
      renderMarkdown();
    });
  }

  function loadWarnings() {
    if (!cwStatusEl) return;
    cwStatusEl.textContent = "Loading content warnings…";
    fetch(CSV_URL)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function (text) {
        state.warnings = parseWarningCsv(text);
        if (!state.warnings.length) {
          cwStatusEl.textContent = "No rows found in " + CSV_URL + ".";
        } else {
          cwStatusEl.textContent = "Loaded " + state.warnings.length + " warnings.";
        }
        renderCwList();
        renderMarkdown();
      })
      .catch(function () {
        cwStatusEl.textContent =
          "Could not load " +
          CSV_URL +
          ". Serve the site over HTTP (not file://) so fetch works, or check the file path.";
        state.warnings = [];
        renderCwList();
        renderMarkdown();
      });
  }

  loadWarnings();
  renderMarkdown();
})();
