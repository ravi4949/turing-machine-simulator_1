/**
 * tape.js
 * ─────────────────────────────────────────────────────────────
 * Handles all tape-related DOM operations.
 *
 * Responsibilities:
 *   • renderTape(tape, headPos, prevHeadPos) – draw the tape cells
 *   • scrollHeadIntoView(headPos)            – keep head visible
 *   • updateHeadIndicator(headPos)           – move the ▲ arrow
 *
 * Design:
 *   We render a fixed window of cells centred around the head
 *   position (with padding on each side). The blank symbol "B"
 *   is shown in a dimmed style to represent the infinite blank tape.
 */

const TAPE_WINDOW_PADDING = 6;  // extra blank cells on each side of the tape content
const BLANK_SYMBOL        = 'B';
const CELL_WIDTH          = 51; // px (48 cell + 3 gap)

/**
 * renderTape(tape, headPos, prevHeadPos)
 *   Renders the tape cells into #tape-cells.
 *
 * @param {string[]} tape       - array of tape symbols
 * @param {number}   headPos    - current head index (0-based)
 * @param {number}   prevHeadPos - previous head (for "written" animation)
 */
function renderTape(tape, headPos, prevHeadPos) {
  const container = document.getElementById('tape-cells');
  if (!container) return;

  // Extend tape with blanks so there's padding on each side
  const displayStart = Math.max(0, headPos - TAPE_WINDOW_PADDING);
  const displayEnd   = Math.max(tape.length - 1, headPos) + TAPE_WINDOW_PADDING;

  const cells = [];
  for (let i = displayStart; i <= displayEnd; i++) {
    cells.push({ index: i, symbol: tape[i] ?? BLANK_SYMBOL });
  }

  // Build DOM
  container.innerHTML = '';
  cells.forEach(({ index, symbol }) => {
    const div = document.createElement('div');
    div.classList.add('tape-cell');
    div.dataset.index = index;

    const isBlank  = symbol === BLANK_SYMBOL || symbol === undefined;
    const isHead   = index === headPos;
    const written  = index === prevHeadPos && index !== headPos;  // cell just written then head moved

    if (isBlank) div.classList.add('blank');
    if (isHead)  div.classList.add('head');
    if (written) div.classList.add('written');

    div.textContent = isBlank ? 'B' : symbol;
    container.appendChild(div);
  });

  updateHeadIndicator(headPos, displayStart);
  scrollHeadIntoView(headPos, displayStart);
}

/**
 * updateHeadIndicator(headPos, displayStart)
 *   Positions the ▲ indicator under the current head cell.
 */
function updateHeadIndicator(headPos, displayStart) {
  const indicator = document.getElementById('head-indicator');
  if (!indicator) return;

  const relativeIndex = headPos - displayStart;
  const leftPx        = relativeIndex * CELL_WIDTH + 16;  // 16 = padding-left of tape-cells
  indicator.style.left = `${leftPx}px`;
}

/**
 * scrollHeadIntoView(headPos, displayStart)
 *   Smoothly scrolls the tape so the head cell is centred.
 */
function scrollHeadIntoView(headPos, displayStart) {
  const scrollEl = document.getElementById('tape-scroll');
  if (!scrollEl) return;

  const relativeIndex = headPos - displayStart;
  const cellLeft      = relativeIndex * CELL_WIDTH + 16;
  const viewWidth     = scrollEl.clientWidth;
  const targetScroll  = cellLeft - viewWidth / 2 + CELL_WIDTH / 2;

  scrollEl.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
}

/**
 * flashHeadCell()
 *   Triggers a brief CSS animation on the current head cell.
 */
function flashHeadCell() {
  const headCell = document.querySelector('.tape-cell.head');
  if (!headCell) return;
  headCell.classList.remove('written');
  void headCell.offsetWidth;   // force reflow to restart animation
  headCell.classList.add('written');
}

/**
 * buildTapeFromInput(inputString)
 *   Converts a raw input string into the initial tape array.
 *   An empty string becomes a tape with a single blank cell.
 */
function buildTapeFromInput(inputString) {
  if (!inputString || inputString.length === 0) return [BLANK_SYMBOL];
  return inputString.split('');
}
