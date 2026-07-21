// ==========================================
// 1. DATA CONFIGURATION (Easily Scalable)
// ==========================================
const GAME_CONFIG = {
  neurons: [
    { id: "n1", title: "Neuron A: Nature", desc: "Landscapes & natural features" },
    { id: "n2", title: "Neuron B: Architecture", desc: "Buildings & structural design" },
    { id: "n3", title: "Neuron C: Animals", desc: "Wildlife & fauna" },
    { id: "n4", title: "Neuron D: Technology", desc: "Devices & hardware" }
  ],
  images: [
    // Nature (Neuron 1)
    { id: "img1", categoryId: "n1", label: "Mountain", src: "https://picsum.photos/id/1018/200/150" },
    { id: "img2", categoryId: "n1", label: "Forest", src: "https://picsum.photos/id/1015/200/150" },
    { id: "img3", categoryId: "n1", label: "River", src: "https://picsum.photos/id/1043/200/150" },
    { id: "img4", categoryId: "n1", label: "Lake", src: "https://picsum.photos/id/1025/200/150" },

    // Architecture (Neuron 2)
    { id: "img5", categoryId: "n2", label: "City", src: "https://picsum.photos/id/1031/200/150" },
    { id: "img6", categoryId: "n2", label: "Bridge", src: "https://picsum.photos/id/1040/200/150" },
    { id: "img7", categoryId: "n2", label: "Skyscraper", src: "https://picsum.photos/id/1076/200/150" },
    { id: "img8", categoryId: "n2", label: "Tower", src: "https://picsum.photos/id/1067/200/150" },

    // Animals (Neuron 3)
    { id: "img9", categoryId: "n3", label: "Dog", src: "https://picsum.photos/id/237/200/150" },
    { id: "img10", categoryId: "n3", label: "Tiger", src: "https://picsum.photos/id/1074/200/150" },
    { id: "img11", categoryId: "n3", label: "Bear", src: "https://picsum.photos/id/1020/200/150" },
    { id: "img12", categoryId: "n3", label: "Bird", src: "https://picsum.photos/id/1024/200/150" },

    // Technology (Neuron 4)
    { id: "img13", categoryId: "n4", label: "Laptop", src: "https://picsum.photos/id/0/200/150" },
    { id: "img14", categoryId: "n4", label: "Camera", src: "https://picsum.photos/id/250/200/150" },
    { id: "img15", categoryId: "n4", label: "Code", src: "https://picsum.photos/id/180/200/150" },
    { id: "img16", categoryId: "n4", label: "Phone", src: "https://picsum.photos/id/160/200/150" }
  ]
};

// ==========================================
// 2. GAME STATE & DOM ELEMENTS
// ==========================================
let timerInterval = null;
let secondsElapsed = 0;
let timerStarted = false;
let selectedElement = null; // For click-to-move accessibility

const neuronsGrid = document.getElementById("neuronsGrid");
const imagePool = document.getElementById("imagePool");
const poolCount = document.getElementById("poolCount");
const timerDisplay = document.getElementById("timerDisplay");
const verifyBtn = document.getElementById("verifyBtn");
const resetBtn = document.getElementById("resetBtn");
const winModal = document.getElementById("winModal");
const finalTime = document.getElementById("finalTime");
const playAgainBtn = document.getElementById("playAgainBtn");
const showTimeBtn = document.getElementById('showTime')

// ==========================================
// 3. INITIALIZATION & RENDERING
// ==========================================
function initGame() {
  stopTimer();
  secondsElapsed = 0;
  timerStarted = false;
  timerDisplay.textContent = "00:00";
  winModal.classList.add("hidden");

  // Clear Containers
  neuronsGrid.innerHTML = "";
  imagePool.innerHTML = "";

  // Render Neurons
  GAME_CONFIG.neurons.forEach(neuron => {
    const card = document.createElement("div");
    card.className = "neuron-card";
    card.innerHTML = `
      <div class="neuron-header">
        <div class="neuron-title">${neuron.title}</div>
        <div class="neuron-desc">${neuron.desc}</div>
      </div>
      <div class="drop-zone" data-category-id="${neuron.id}"></div>
    `;
    neuronsGrid.appendChild(card);
  });

  // Shuffle & Render Images into Pool
  const shuffledImages = [...GAME_CONFIG.images].sort(() => Math.random() - 0.5);
  shuffledImages.forEach(imgData => {
    const imgEl = createDraggableImage(imgData);
    imagePool.appendChild(imgEl);
  });

  updatePoolCount();
  setupDragAndDropEvents();
}

function createDraggableImage(data) {
  const item = document.createElement("div");
  item.className = "img-item";
  item.draggable = true;
  item.dataset.id = data.id;
  item.dataset.targetCategory = data.categoryId;

  item.innerHTML = `<img src="${data.src}" alt="${data.label}">`;

  // Click selection support (mobile fallback)
  item.addEventListener("click", (e) => {
    e.stopPropagation();
    startTimerIfNeeded();

    if (selectedElement === item) {
      item.classList.remove("selected");
      selectedElement = null;
    } else {
      if (selectedElement) selectedElement.classList.remove("selected");
      selectedElement = item;
      item.classList.add("selected");
    }
  });

  return item;
}

// ==========================================
// 4. DRAG AND DROP HANDLERS
// ==========================================
function setupDragAndDropEvents() {
  const dropZones = document.querySelectorAll(".drop-zone");
  const items = document.querySelectorAll(".img-item");

  items.forEach(item => {
    item.addEventListener("dragstart", (e) => {
      startTimerIfNeeded();
      item.classList.add("dragging");
      e.dataTransfer.setData("text/plain", item.dataset.id);
    });

    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
    });
  });

  dropZones.forEach(zone => {
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      zone.classList.add("drag-over");
    });

    zone.addEventListener("dragleave", () => {
      zone.classList.remove("drag-over");
    });

    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("drag-over");

      const imgId = e.dataTransfer.getData("text/plain");
      const draggedEl = document.querySelector(`[data-id="${imgId}"]`);

      if (draggedEl) {
        zone.appendChild(draggedEl);
        clearValidationStyles(draggedEl);
        updatePoolCount();
      }
    });

    // Click on drop zone to move selected element
    zone.addEventListener("click", () => {
      if (selectedElement) {
        zone.appendChild(selectedElement);
        clearValidationStyles(selectedElement);
        selectedElement.classList.remove("selected");
        selectedElement = null;
        updatePoolCount();
      }
    });
  });
}

function clearValidationStyles(element) {
  element.classList.remove("correct", "incorrect");
}

function updatePoolCount() {
  const count = imagePool.children.length;
  poolCount.textContent = count;
}

// ==========================================
// 5. TIMER CONTROLS
// ==========================================
function startTimerIfNeeded() {
  if (timerStarted) return;
  timerStarted = true;
  timerInterval = setInterval(() => {
    secondsElapsed++;
    const mins = String(Math.floor(secondsElapsed / 60)).padStart(2, "0");
    const secs = String(secondsElapsed % 60).padStart(2, "0");
    timerDisplay.textContent = `${mins}:${secs}`;
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

// ==========================================
// 6. VERIFICATION LOGIC
// ==========================================
verifyBtn.addEventListener("click", () => {
  const allImages = document.querySelectorAll(".img-item");
  let totalCorrect = 0;

  allImages.forEach(img => {
    const parentZone = img.parentElement;
    const currentCategoryId = parentZone.dataset.categoryId;
    const targetCategoryId = img.dataset.targetCategory;

    clearValidationStyles(img);

    if (currentCategoryId === targetCategoryId) {
      img.classList.add("correct");
      totalCorrect++;
    } else if (currentCategoryId !== "pool") {
      img.classList.add("incorrect");
    }
  });

  // Check Win Condition (All 16 placed correctly)
  if (totalCorrect === GAME_CONFIG.images.length) {
    stopTimer();
    finalTime.textContent = timerDisplay.textContent;
    winModal.classList.remove("hidden");
  }
});

function disappear() {
  timerDisplay.classList.toggle('timerDisappear');
};

showTimeBtn.addEventListener('click', () => {
  disappear();
  if (showTimeBtn.innerText === "Hide Timer") {
    showTimeBtn.innerText = "Show Timer";
  } else {
    showTimeBtn.innerText = "Hide Timer";
  }
}
)

resetBtn.addEventListener("click", initGame);
playAgainBtn.addEventListener("click", initGame);

// Start game on load
initGame();