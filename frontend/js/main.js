/**
 * main.js - Application Controller (Fixed)
 *
 * KEY FIX: UI step wrappers are named uiStepForward / uiStepBack
 * so they never override the original stepForward / stepBack
 * functions in simulator.js (which startPlay also calls internally).
 */

var _machines        = [];
var _selectedMachine = null;
var _prevHeadPos     = 0;
var _logCollapsed    = false;
var _graphDef        = null;

/* ── Particle Background ─────────────────────────────────── */
(function initParticles() {
  var canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W, H, particles;
  var CHARS = '01';
  var N = 55;

  function resize() {
    W = canvas.width  = canvas.parentElement.clientWidth  || 800;
    H = canvas.height = canvas.parentElement.clientHeight || 600;
  }

  function rp() {
    return {
      x:       Math.random() * (W || 800),
      y:       Math.random() * (H || 600),
      ch:      CHARS[Math.floor(Math.random() * 2)],
      speed:   0.15 + Math.random() * 0.3,
      opacity: 0.04 + Math.random() * 0.1,
      size:    10   + Math.random() * 14,
    };
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(0,229,255,0.03)';
    ctx.lineWidth   = 1;
    for (var x = 0; x < W; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (var y = 0; y < H; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    particles.forEach(function(p) {
      ctx.font      = p.size + 'px Space Mono,monospace';
      ctx.fillStyle = 'rgba(0,229,255,' + p.opacity + ')';
      ctx.fillText(p.ch, p.x, p.y);
      p.y -= p.speed;
      if (p.y < -20) {
        p.y = H + 20;
        p.x = Math.random() * W;
        p.ch = CHARS[Math.floor(Math.random() * 2)];
      }
    });
    requestAnimationFrame(draw);
  }

  resize();
  window.addEventListener('resize', resize);
  particles = [];
  for (var i = 0; i < N; i++) particles.push(rp());
  draw();
})();

/* ── Navigation ──────────────────────────────────────────── */
function navigate(pageId) {
  document.querySelectorAll('.page').forEach(function(p) {
    p.classList.remove('active');
    p.style.display = 'none';
  });
  var target = document.getElementById(pageId);
  if (!target) return;
  target.style.display = 'block';
  void target.offsetWidth;
  target.classList.add('active', 'fade-in');
  if (pageId === 'page-select') _loadMachineCards();
}
window.navigate = navigate;

/* ── Load Machine Cards ──────────────────────────────────── */
async function _loadMachineCards() {
  if (_machines.length > 0) { _renderMachineCards(_machines); return; }
  try {
    _machines = await fetchMachines();
    _renderMachineCards(_machines);
  } catch (err) {
    var c = document.getElementById('machine-cards');
    if (c) c.innerHTML = '<div style="color:#ff4466;padding:1rem;font-family:monospace">Error loading machines: ' + err.message + '</div>';
  }
}

function _renderMachineCards(machines) {
  var container = document.getElementById('machine-cards');
  if (!container) return;
  container.innerHTML = '';
  machines.forEach(function(m, i) {
    var card = document.createElement('div');
    card.className = 'machine-card';
    card.innerHTML =
      '<div class="machine-card-num">Machine 0' + (i + 1) + '</div>' +
      '<h3>' + m.name + '</h3>' +
      '<p>' + m.description + '</p>' +
      '<div class="machine-card-hint">' + m.inputHint + '</div>' +
      '<div class="machine-examples">' +
        m.examples.map(function(ex) {
          return '<span class="example-chip">' + ex + '</span>';
        }).join('') +
      '</div>' +
      '<div class="machine-card-cta">Select Machine →</div>';

    // Example chip clicks
    card.querySelectorAll('.example-chip').forEach(function(chip) {
      chip.addEventListener('click', function(e) {
        e.stopPropagation();
        selectMachine(m);
        setTimeout(function() { useExample(chip.textContent); }, 300);
      });
    });

    card.addEventListener('click', function() { selectMachine(m); });
    container.appendChild(card);
  });
}

/* ── Select Machine ──────────────────────────────────────── */
async function selectMachine(machine) {
  _selectedMachine = machine;
  navigate('page-sim');

  var badge = document.getElementById('machine-name-badge');
  if (badge) badge.textContent = machine.name;

  resetSim();

  // Example chips in sim panel
  var chips = document.getElementById('example-chips');
  if (chips) {
    chips.innerHTML = machine.examples.map(function(ex) {
      return '<span class="example-chip" onclick="useExample(\'' + ex + '\')">' + ex + '</span>';
    }).join('');
  }

  // Load and draw graph
  try {
    var gDef = await fetchGraph(machine.id);
    _graphDef = gDef;

    // Delay so container is fully rendered before D3 reads its size
    setTimeout(function() {
      if (typeof drawGraph === 'function') {
        drawGraph('graph-container', gDef);
      }
      setTimeout(function() {
        if (typeof highlightState === 'function') {
          highlightState(gDef.startState);
        }
      }, 400);
    }, 200);

    // Zoom buttons
    var zi = document.getElementById('zoom-in-btn');
    var zo = document.getElementById('zoom-out-btn');
    var zr = document.getElementById('reset-zoom-btn');
    if (zi) zi.onclick = function() { if (typeof zoomIn   === 'function') zoomIn();   };
    if (zo) zo.onclick = function() { if (typeof zoomOut  === 'function') zoomOut();  };
    if (zr) zr.onclick = function() { if (typeof resetZoom === 'function') resetZoom(); };

  } catch (err) {
    console.error('Graph load error:', err.message);
  }
}
window.selectMachine = selectMachine;

/* ── Use Example ─────────────────────────────────────────── */
function useExample(value) {
  var input = document.getElementById('input-string');
  var errEl = document.getElementById('input-error');
  if (input) {
    input.value = value;
    input.style.borderColor = '';
    if (errEl) errEl.textContent = '';
    input.focus();
  }
}
window.useExample = useExample;

/* ── Handle Check String ─────────────────────────────────── */
async function handleCheck() {
  var inputEl = document.getElementById('input-string');
  var errEl   = document.getElementById('input-error');
  if (!inputEl || !errEl) return;

  var input = inputEl.value.trim();

  // Validate
  var v = validateInput(input, _selectedMachine ? _selectedMachine.id : null);
  if (!v.valid) {
    errEl.textContent       = v.error;
    inputEl.style.borderColor = '#ff4466';
    return;
  }
  errEl.textContent       = '';
  inputEl.style.borderColor = '';

  if (!_selectedMachine) {
    errEl.textContent = 'Please select a machine first.';
    return;
  }

  var checkBtn = document.getElementById('check-btn');
  if (checkBtn) { checkBtn.disabled = true; checkBtn.textContent = 'Running…'; }

  try {
    await runSimulation(_selectedMachine.id, input);
    _showSimSections();
    _renderStep(false);
  } catch (err) {
    errEl.textContent       = 'Error: ' + err.message;
    inputEl.style.borderColor = '#ff4466';
    console.error('Simulation error:', err);
  } finally {
    if (checkBtn) { checkBtn.disabled = false; checkBtn.textContent = 'Check String'; }
  }
}
window.handleCheck = handleCheck;

/* ── Show / Hide Simulation Sections ────────────────────── */
function _showSimSections() {
  ['tape-section', 'transition-section', 'controls-section', 'history-section'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = '';
  });
  var rb = document.getElementById('result-banner');
  if (rb) rb.style.display = 'none';
  _buildHistoryLog();
  _refreshButtons();
}

/* ── Render a Step ───────────────────────────────────────── */
function _renderStep(animate) {
  var cfg = SimState.current();
  if (!cfg) return;

  // Tape
  renderTape(cfg.tape, cfg.headPos, _prevHeadPos);
  if (animate) flashHeadCell();
  _prevHeadPos = cfg.headPos;

  // Step counter
  var sc = document.getElementById('step-counter');
  if (sc) sc.textContent = 'Step ' + cfg.step;

  // Transition details
  var tf = document.getElementById('transition-formula');
  var cs = document.getElementById('current-state-label');
  var rs = document.getElementById('read-symbol-label');
  var ws = document.getElementById('write-symbol-label');
  var dl = document.getElementById('direction-label');

  if (tf) tf.textContent = cfg.transitionStr  || '—';
  if (cs) cs.textContent = cfg.state          || '—';
  if (rs) rs.textContent = (cfg.readSymbol    != null) ? cfg.readSymbol    : '—';
  if (ws) ws.textContent = (cfg.writtenSymbol != null) ? cfg.writtenSymbol : '—';
  if (dl) dl.textContent = cfg.direction      || '—';

  // Highlight state in diagram
  if (typeof highlightState === 'function') highlightState(cfg.state);

  // History log highlight
  document.querySelectorAll('.log-entry').forEach(function(el) {
    el.classList.remove('current');
  });
  var cur = document.querySelector('.log-entry[data-step="' + cfg.step + '"]');
  if (cur) { cur.classList.add('current'); cur.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }

  // Show result banner if terminal state
  if (cfg.state === 'q_accept' || cfg.state === 'q_reject') {
    _showResultBanner(cfg.state === 'q_accept');
  }

  _refreshButtons();
}

/* ── History Log ─────────────────────────────────────────── */
function _buildHistoryLog() {
  var log = document.getElementById('history-log');
  if (!log) return;
  log.innerHTML = '';

  SimState.history.forEach(function(cfg) {
    var isAcc = cfg.state === 'q_accept';
    var isRej = cfg.state === 'q_reject';
    var div = document.createElement('div');
    div.className  = 'log-entry' + (isAcc ? ' accept' : isRej ? ' reject' : '');
    div.dataset.step = cfg.step;
    div.innerHTML =
      '<span class="log-step">#' + String(cfg.step).padStart(3, '0') + '</span>' +
      '<span class="log-state">' + cfg.state + '</span>' +
      '<span class="log-transition">' + (cfg.transitionStr || '') + '</span>';
    div.addEventListener('click', function() {
      stopPlay();
      goToStep(cfg.step);
      _renderStep(true);
    });
    log.appendChild(div);
  });
}

function toggleLog() {
  _logCollapsed = !_logCollapsed;
  var log = document.getElementById('history-log');
  var btn = document.getElementById('toggle-log-btn');
  if (log) log.style.display = _logCollapsed ? 'none' : '';
  if (btn) btn.textContent   = _logCollapsed ? '▶'   : '▼';
}
window.toggleLog = toggleLog;

/* ── Step Controls (UI wrappers — different names from simulator!) */

/**
 * uiStepForward / uiStepBack are the UI-level wrappers.
 * They call stepForward() / stepBack() from simulator.js directly.
 * We do NOT override window.stepForward to avoid infinite recursion.
 */
function uiStepForward() {
  stopPlay();
  var cfg = stepForward();   // calls the original from simulator.js
  if (cfg) _renderStep(true);
}

function uiStepBack() {
  stopPlay();
  var cfg = stepBack();      // calls the original from simulator.js
  if (cfg) _renderStep(false);
}

window.uiStepForward = uiStepForward;
window.uiStepBack    = uiStepBack;

/* ── Play / Pause ────────────────────────────────────────── */
function togglePlay() {
  if (SimState.isPlaying) {
    stopPlay();
    _refreshButtons();
    return;
  }
  var slider = document.getElementById('speed-slider');
  var speed  = slider ? parseInt(slider.value) : 5;

  startPlay(
    function() { _renderStep(true); },
    function() { _refreshButtons(); },
    speed
  );
  _refreshButtons();
}
window.togglePlay = togglePlay;

/* ── Reset ───────────────────────────────────────────────── */
function resetSim() {
  stopPlay();
  SimState.reset();
  _prevHeadPos = 0;

  ['tape-section', 'transition-section', 'controls-section', 'history-section'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  var rb = document.getElementById('result-banner');
  if (rb) rb.style.display = 'none';

  var inputEl = document.getElementById('input-string');
  if (inputEl) inputEl.value = '';
  var errEl = document.getElementById('input-error');
  if (errEl) errEl.textContent = '';

  // Re-highlight start state
  if (_graphDef && typeof highlightState === 'function') {
    highlightState(_graphDef.startState);
  }
}
window.resetSim = resetSim;

/* ── Refresh control button states ──────────────────────── */
function _refreshButtons() {
  var btnPrev = document.getElementById('btn-prev');
  var btnStep = document.getElementById('btn-step');
  var btnPlay = document.getElementById('btn-play');

  if (btnPrev) btnPrev.disabled = SimState.isAtStart();
  if (btnStep) btnStep.disabled = SimState.isAtEnd();
  if (btnPlay) {
    btnPlay.textContent = SimState.isPlaying ? '⏸' : '▶';
    btnPlay.classList.toggle('playing', SimState.isPlaying);
    btnPlay.disabled = SimState.isAtEnd() && !SimState.isPlaying;
  }
}

/* ── Result Banner ───────────────────────────────────────── */
function _showResultBanner(accepted) {
  var banner = document.getElementById('result-banner');
  var icon   = document.getElementById('result-icon');
  var text   = document.getElementById('result-text');
  var sub    = document.getElementById('result-sub');
  if (!banner) return;

  var tape = (SimState.result && SimState.result.finalTape)
    ? SimState.result.finalTape.join('')
    : '';
  var steps = (SimState.result) ? SimState.result.steps : 0;

  banner.style.display = '';
  icon.textContent     = accepted ? '✅' : '❌';
  text.textContent     = accepted ? 'ACCEPTED' : 'REJECTED';
  text.className       = 'result-text ' + (accepted ? 'accepted' : 'rejected');
  sub.textContent      = 'Final tape: ' + (tape || '(blank)') + ' · ' + steps + ' steps';
}

/* ── DOMContentLoaded Init ───────────────────────────────── */
document.addEventListener('DOMContentLoaded', function() {

  // Speed slider
  var slider = document.getElementById('speed-slider');
  var label  = document.getElementById('speed-label');
  if (slider && label) {
    slider.addEventListener('input', function() {
      label.textContent = slider.value + 'x';
      if (SimState.isPlaying) {
        stopPlay();
        startPlay(
          function() { _renderStep(true); },
          function() { _refreshButtons(); },
          parseInt(slider.value)
        );
      }
    });
  }

  // Live input validation + Enter key
  var inputEl = document.getElementById('input-string');
  var errEl   = document.getElementById('input-error');
  if (inputEl && errEl) {
    inputEl.addEventListener('input', function() {
      var v = validateInput(inputEl.value.trim(), _selectedMachine ? _selectedMachine.id : null);
      errEl.textContent       = v.error || '';
      inputEl.style.borderColor = v.error ? '#ff4466' : '';
    });
    inputEl.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') handleCheck();
    });
  }

  // Show landing page
  navigate('page-landing');
});
