// ==========================================
// 1. DATA (Scalable Activation Dataset)
// ==========================================
const LEVEL_DATA = {
  concept: "The Daily Neuron",
  // True activation score ascending order (1 = lowest, 5 = highest)
  images: [
    { id: "img1", score: 5, src: "../Neuron ranker/images/1.jpg" },
    { id: "img2", score: 4, src: "../Neuron ranker/images/2.jpg" },
    { id: "img3", score: 3, src: "../Neuron ranker/images/3.jpg" },
    { id: "img4", score: 2, src: "../Neuron ranker/images/4.jpg" },
    { id: "img5", score: 1, src: "../Neuron ranker/images/5.jpg" }
  ]
};

const MAX_ATTEMPTS = 6;
let currentAttempts = 0;
let currentSequence = [];

// ==========================================
// 2. DOM SETUP & INIT
// ==========================================
const neuronConceptEl = document.getElementById("neuronConcept");
const rankSlotsContainer = document.getElementById("rankSlots");
const historyContainer = document.getElementById("historyContainer");
const attemptCounter = document.getElementById("attemptCounter");
const submitBtn = document.getElementById("submitBtn");
const resetBtn = document.getElementById("resetBtn");

function initGame() {
  neuronConceptEl.textContent = LEVEL_DATA.concept;
  currentAttempts = 0;
  attemptCounter.textContent = `${currentAttempts} / ${MAX_ATTEMPTS}`;
  historyContainer.innerHTML = "";

  // Shuffle images to start
  currentSequence = [...LEVEL_DATA.images].sort(() => Math.random() - 0.5);
  renderSlots();
}

// ==========================================
// 3. RENDER DRAGGABLE SLOTS
// ==========================================
function renderSlots() {
  rankSlotsContainer.innerHTML = "";

  currentSequence.forEach((item, index) => {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.dataset.index = index;

    const card = document.createElement("div");
    card.className = "card";
    card.draggable = true;
    card.dataset.id = item.id;
    card.innerHTML = `
      <img src="${item.src}" alt="${item.label}">
      <div class="card-label">${item.label}</div>
    `;

    // Drag Events
    card.addEventListener("dragstart", (e) => {
      card.classList.add("dragging");
      e.dataTransfer.setData("text/plain", index);
    });

    card.addEventListener("dragend", () => card.classList.remove("dragging"));

    slot.appendChild(card);
    rankSlotsContainer.appendChild(slot);
  });

  enableDropZones();
}

function enableDropZones() {
  const slots = document.querySelectorAll(".slot");

  slots.forEach(slot => {
    slot.addEventListener("dragover", (e) => {
      e.preventDefault();
      slot.classList.add("drag-over");
    });

    slot.addEventListener("dragleave", () => slot.classList.remove("drag-over"));

    slot.addEventListener("drop", (e) => {
      e.preventDefault();
      slot.classList.remove("drag-over");

      const originIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
      const targetIndex = parseInt(slot.dataset.index, 10);

      // Swap items in state array
      const movedItem = currentSequence.splice(originIndex, 1)[0];
      currentSequence.splice(targetIndex, 0, movedItem);

      renderSlots();
    });
  });
}

// ==========================================
// 4. SUBMISSION & WORDLE-STYLE EVALUATION
// ==========================================
submitBtn.addEventListener("click", () => {
  if (currentAttempts >= MAX_ATTEMPTS) return;

  currentAttempts++;
  attemptCounter.textContent = `${currentAttempts} / ${MAX_ATTEMPTS}`;

  // Correct order is sorted by activation score ascending
  const correctOrder = [...LEVEL_DATA.images].sort((a, b) => a.score - b.score);
  const row = document.createElement("div");
  row.className = "history-row";

  let correctCount = 0;

  currentSequence.forEach((item, idx) => {
    const tile = document.createElement("div");
    tile.className = "history-tile";

    const correctIndex = correctOrder.findIndex(img => img.id === item.id);

    // Wordle Feedback Logic:
    // Green: Exact match
    // Yellow: Off by 1 position
    // Red: Off by 2 or more positions
    if (correctIndex === idx) {
      tile.classList.add("status-correct");
      correctCount++;
    } else if (Math.abs(correctIndex - idx) === 1) {
      tile.classList.add("status-close");
    } else {
      tile.classList.add("status-wrong");
    }

    tile.innerHTML = `
      <img src="${item.src}">
      <span class="badge">${item.label}</span>
    `;
    row.appendChild(tile);
  });

  historyContainer.prepend(row);

  if (correctCount === LEVEL_DATA.images.length) {
    setTimeout(() => alert("🎉 Perfect Alignment! You correctly ranked all activation levels!"), 100);
  } else if (currentAttempts >= MAX_ATTEMPTS) {
    setTimeout(() => alert("Game Over! Try resetting to re-align the network."), 100);
  }
});

resetBtn.addEventListener("click", initGame);

// Run
initGame();