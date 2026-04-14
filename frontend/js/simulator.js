/**
 * simulator.js
 * ─────────────────────────────────────────────────────────────
 * Client-side Turing Machine engine.
 *
 * Responsibilities:
 *   • Holds the full simulation state (tape, head, step index, history)
 *   • Calls the backend API to run the full simulation
 *   • Exposes methods for step-by-step playback (stepForward / stepBack)
 *   • Fires callbacks for UI updates (onStep, onComplete)
 *
 * Theory note:
 *   The backend runs the complete TM and returns every configuration in
 *   the history array. Client-side we just replay those configurations,
 *   which keeps the UI decoupled from the logic and allows instant backward
 *   stepping (since all states are pre-computed).
 */

/* ── Simulator State ─────────────────────────────────────────── */
const SimState = {
  history:      [],    // Full array of configuration snapshots from backend
  currentStep:  0,     // Index into history we are currently displaying
  isPlaying:    false, // Auto-run flag
  playTimer:    null,  // setInterval handle
  machineId:    null,
  inputString:  null,
  result:       null,  // { accepted, finalTape, steps, finalState }

  /** Reset to pristine state (no simulation loaded) */
  reset() {
    clearInterval(this.playTimer);
    this.history      = [];
    this.currentStep  = 0;
    this.isPlaying    = false;
    this.playTimer    = null;
    this.result       = null;
  },

  /** True if we are at the last step of the history */
  isAtEnd() {
    return this.currentStep >= this.history.length - 1;
  },

  /** True if we are at the first step */
  isAtStart() {
    return this.currentStep <= 0;
  },

  /** Current configuration snapshot */
  current() {
    return this.history[this.currentStep] ?? null;
  },
};

/* ── API Helpers ─────────────────────────────────────────────── */

const API_BASE = window.location.origin;

/**
 * fetchMachines()
 * Returns array of { id, name, description, inputHint, examples }
 */
async function fetchMachines() {
  const res = await fetch(`${API_BASE}/api/machines`);
  if (!res.ok) throw new Error('Failed to load machines');
  const { machines } = await res.json();
  return machines;
}

/**
 * fetchGraph(machineId)
 * Returns the state-diagram definition: { states, transitions, startState, acceptState, rejectState }
 */
async function fetchGraph(machineId) {
  const res = await fetch(`${API_BASE}/api/machines/${machineId}/graph`);
  if (!res.ok) throw new Error('Failed to load graph');
  return res.json();
}

/**
 * runSimulation(machineId, input)
 * Calls the backend, populates SimState.history, and returns the result.
 *
 * @returns {{ accepted, steps, finalTape, history }}
 */
async function runSimulation(machineId, input) {
  SimState.reset();
  SimState.machineId   = machineId;
  SimState.inputString = input;

  const res = await fetch(`${API_BASE}/api/simulate`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ machineId, input }),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Simulation failed');
  }

  const data = await res.json();

  SimState.history = data.history;
  SimState.result  = {
    accepted:   data.accepted,
    finalTape:  data.finalTape,
    steps:      data.steps,
    finalState: data.finalState,
  };
  SimState.currentStep = 0;

  return data;
}

/* ── Step Controls ───────────────────────────────────────────── */

/**
 * stepForward()
 * Advance one step in the history and trigger UI update.
 * Returns the new configuration or null if already at end.
 */
function stepForward() {
  if (SimState.isAtEnd()) return null;
  SimState.currentStep++;
  return SimState.current();
}

/**
 * stepBack()
 * Go back one step in the history.
 * Returns the configuration at the previous step.
 */
function stepBack() {
  if (SimState.isAtStart()) return null;
  SimState.currentStep--;
  return SimState.current();
}

/**
 * goToStep(index)
 * Jump directly to a given step index.
 */
function goToStep(index) {
  const clampedIndex = Math.max(0, Math.min(index, SimState.history.length - 1));
  SimState.currentStep = clampedIndex;
  return SimState.current();
}

/* ── Auto-play ───────────────────────────────────────────────── */

/**
 * startPlay(onStepCallback, onEndCallback, speedMultiplier)
 * Starts the auto-run. Calls onStepCallback(config) for each step
 * and onEndCallback() when the simulation ends.
 *
 * @param {Function} onStepCallback  - called with current config each tick
 * @param {Function} onEndCallback   - called when end is reached
 * @param {number}   speedMultiplier - 1–10 (higher = faster)
 */
function startPlay(onStepCallback, onEndCallback, speedMultiplier = 5) {
  if (SimState.isPlaying) return;
  SimState.isPlaying = true;

  // Convert speed multiplier (1-10) to delay in ms (1000ms → 50ms)
  const delay = Math.max(50, 1050 - speedMultiplier * 100);

  SimState.playTimer = setInterval(() => {
    if (SimState.isAtEnd()) {
      stopPlay();
      if (typeof onEndCallback === 'function') onEndCallback();
      return;
    }
    const config = stepForward();
    if (typeof onStepCallback === 'function') onStepCallback(config);
  }, delay);
}

/**
 * stopPlay()
 * Pauses auto-run.
 */
function stopPlay() {
  clearInterval(SimState.playTimer);
  SimState.playTimer = null;
  SimState.isPlaying = false;
}

/* ── Input Validation ────────────────────────────────────────── */

/**
 * validateInput(input, machineId)
 * Returns { valid: boolean, error: string|null }
 */
function validateInput(input, machineId) {
  if (typeof input !== 'string') return { valid: false, error: 'Input must be a string' };
  if (input.length === 0)       return { valid: true,  error: null };    // empty string OK
  if (input.length > 64)        return { valid: false, error: 'Input too long (max 64 chars)' };
  if (!/^[01]+$/.test(input))   return { valid: false, error: 'Input must contain only 0 and 1' };
  return { valid: true, error: null };
}
