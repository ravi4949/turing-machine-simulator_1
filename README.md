# 🤖 Turing Machine Visualizer

An interactive, production-quality web application that simulates, visualizes, and explains Turing Machines — built for a Theory of Computation college assignment.

---

## 📁 Folder Structure

```
turing-machine-simulator/
├── backend/
│   ├── server.js                    ← Express API server (all endpoints)
│   ├── package.json
│   └── machines/
│       ├── binaryIncrementer.js     ← TM: adds 1 to a binary number
│       ├── palindromeChecker.js     ← TM: palindrome detection
│       └── evenZeroChecker.js       ← TM: even number of zeros
└── frontend/
    ├── index.html                   ← Single-page app shell
    ├── css/
    │   └── style.css                ← Full stylesheet (dark terminal aesthetic)
    └── js/
        ├── simulator.js             ← API client + simulation state engine
        ├── visualizer.js            ← D3.js state-diagram renderer
        ├── tape.js                  ← Tape DOM rendering + animation
        └── main.js                  ← App controller (navigation + UI wiring)
```

---

## 🚀 How to Run

### Prerequisites
- **Node.js** v16 or later — https://nodejs.org
- A modern browser (Chrome / Firefox / Edge / Safari)

### Step 1 — Install dependencies
```bash
cd turing-machine-simulator/backend
npm install
```

### Step 2 — Start the server
```bash
node server.js
```
You should see:
```
🤖 Turing Machine Simulator API running at http://localhost:3001
   Frontend:  http://localhost:3001
   API docs:  http://localhost:3001/api/machines
```

### Step 3 — Open in browser
Visit: **http://localhost:3001**

> The Express server automatically serves the frontend files — no separate build step needed.

---

## 🧪 Example Test Cases

### Binary Incrementer
| Input  | Expected Output Tape | Result   |
|--------|----------------------|----------|
| `1011` | `1100`               | ACCEPTED |
| `1111` | `10000`              | ACCEPTED |
| `0`    | `1`                  | ACCEPTED |
| `101`  | `110`                | ACCEPTED |
| *(empty)* | `1`             | ACCEPTED |

### Palindrome Checker
| Input   | Expected | Result   |
|---------|----------|----------|
| `10101` | true     | ACCEPTED |
| `1001`  | true     | ACCEPTED |
| `11`    | true     | ACCEPTED |
| `0`     | true     | ACCEPTED |
| `10`    | false    | REJECTED |
| `100`   | false    | REJECTED |
| `1010`  | false    | REJECTED |

### Even Zeros Checker
| Input  | Expected | Reason              |
|--------|----------|---------------------|
| `1111` | true     | 0 zeros (even)      |
| `00`   | true     | 2 zeros (even)      |
| `0110` | true     | 2 zeros (even)      |
| `0`    | false    | 1 zero (odd)        |
| `1001` | true     | 2 zeros (even)      |

---

## 🎮 How to Use the App

1. **Landing Page** — Read the intro; click "Start Simulation" or "Learn Concepts".
2. **Learn Concepts** — Study the formal definition M = (Q, Σ, Γ, δ, q₀, q_accept, q_reject).
3. **Select Machine** — Pick one of the three machines; example inputs shown as chips.
4. **Simulator Page:**
   - Type (or click) an input string in the Input box
   - Click **Check String** → the backend runs the full simulation
   - Use **⏭ Step** to advance one step at a time
   - Use **⏮ Back** to step backwards (full history is stored)
   - Use **▶ Play** for auto-run; drag the Speed slider to adjust pace
   - Click any row in the **Execution Log** to jump directly to that step
   - The **State Diagram** highlights the active state in yellow on every step
   - Drag nodes in the diagram to rearrange the layout; zoom with +/−

---

## 🌐 API Reference

### `GET /api/machines`
Returns all available machines.
```json
{
  "machines": [
    { "id": "binary_incrementer", "name": "Binary Incrementer", "examples": ["1011", "1111"] },
    ...
  ]
}
```

### `GET /api/machines/:id/graph`
Returns the state-diagram definition for D3 rendering.
```json
{
  "states": [{ "id": "q0", "label": "q₀", "type": "start" }, ...],
  "transitions": [{ "from": "q0", "to": "q1", "label": "0→0,R" }, ...],
  "startState": "q0",
  "acceptState": "q_accept",
  "rejectState": "q_reject"
}
```

### `POST /api/simulate`
**Request body:**
```json
{ "machineId": "palindrome_checker", "input": "10101" }
```
**Response:**
```json
{
  "accepted": true,
  "finalState": "q_accept",
  "finalTape": ["X","X","X","X","X"],
  "steps": 36,
  "history": [
    {
      "step": 0,
      "tape": ["1","0","1","0","1"],
      "headPos": 0,
      "state": "q0",
      "transitionStr": "Initial configuration",
      "readSymbol": "1",
      "writtenSymbol": null,
      "direction": null
    },
    ...
  ]
}
```

---

## 🎓 Viva Support — 5-Line Explanation

> "This project implements a full-stack **Turing Machine Simulator** with a **Node.js/Express backend** that encodes the transition function δ as a nested object map and runs the machine step-by-step, storing every configuration in a history array. The **frontend** replays this history interactively using step/back/play controls, rendering a live **tape visualization** with a moving head indicator and a **D3.js force-directed state diagram** that highlights the active state at every step. Three complete machines are included — Binary Incrementer, Palindrome Checker, and Even-Zeros Checker — each with formal state definitions and fully tested transition tables. The architecture is **modular**: `simulator.js` handles the API and state engine, `visualizer.js` owns the graph, `tape.js` owns DOM rendering, and `main.js` wires the pages together. All edge cases are handled: blank tape expansion, backward stepping, speed control, input validation, and implicit rejection on undefined transitions."

---

## 📚 Key Theory of Computation Concepts Used

| Concept | Implementation |
|---|---|
| **Turing Machine** | 7-tuple M = (Q, Σ, Γ, δ, q₀, q_accept, q_reject) encoded in JS objects |
| **Transition Function δ** | `transitions[state][symbol] → { nextState, write, direction }` |
| **Infinite Tape** | Array extended with blank (`B`) symbols dynamically as head moves |
| **Accept / Reject** | Machine halts when it enters `q_accept` or `q_reject`; no valid transition → implicit reject |
| **Configuration** | Snapshot (state, tape, headPos) at every step stored in `history[]` |
| **Decidability** | All three machines are decidable — they always halt on any binary input |

---

## 🛠 Tech Stack Summary

| Layer | Technology |
|---|---|
| Frontend UI | HTML5, CSS3 (custom design), Vanilla JavaScript ES2022 |
| State Diagram | D3.js v7 (force-directed layout, SVG, zoom, drag) |
| Backend API | Node.js 16+ with Express 4 |
| No DB needed | All state is computed per request; history returned in response |
