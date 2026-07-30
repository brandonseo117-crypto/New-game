const DATA_SET = [
  { id: 0, val: 16, img: "../sneurt/images/1.jpg" },
  { id: 1, val: 15, img: "../sneurt/images/2.jpg" },
  { id: 2, val: 14, img: "../sneurt/images/3.jpg" },
  { id: 3, val: 13, img: "../sneurt/images/4.jpg" },
  { id: 4, val: 12, img: "../sneurt/images/5.jpg" },
  { id: 5, val: 11, img: "../sneurt/images/6.jpg" },
  { id: 6, val: 10, img: "../sneurt/images/7.jpg" },
  { id: 7, val: 9, img: "../sneurt/images/8.jpg" },
  { id: 8, val: 8, img: "../sneurt/images/9.jpg" },
  { id: 9, val: 7, img: "../sneurt/images/10.jpg" },
  { id: 10, val: 6, img: "../sneurt/images/11.jpg" },
  { id: 11, val: 5, img: "../sneurt/images/12.jpg" },
  { id: 12, val: 4, img: "../sneurt/images/13.jpg" },
  { id: 13, val: 3, img: "../sneurt/images/14.jpg" },
  { id: 14, val: 2, img: "../sneurt/images/15.jpg" },
  { id: 15, val: 1, img: "../sneurt/images/16.jpg" }
];

class StrandsGame {
  constructor() {
    this.gridSize = 4; // Expanded 4x4 Grid
    this.anchorIndex = 0; // Explicit Anchor Start Node
    this.targetPathLength = 4; // Length required to trigger auto-validation

    this.gridEl = document.getElementById('strands-grid');
    this.svgEl = document.getElementById('path-overlay');
    this.feedbackEl = document.getElementById('feedback');
    this.scoreDisplayEl = document.getElementById('score-display');

    this.path = [];
    this.isDragging = false;
    this.isProcessing = false;
    this.currentScore = 0;
    this.currentStreak = 0;

    // Solution trajectory for 4x4 grid: [0 -> 1 -> 5 -> 10]
    this.correctSolution = [0, 1, 5, 10];

    this.init();
  }

  init() {
    this.path = [];
    this.isDragging = false;
    this.isProcessing = false;
    this.feedbackEl.innerText = "";
    this.updateScoreUI();

    this.buildGrid();
    this.attachEventListeners();
    this.render();
  }

  updateScoreUI() {
    if (this.scoreDisplayEl) {
      this.scoreDisplayEl.innerText = `Score: ${Math.max(0, this.currentScore)}`;
    }
  }

  showToast(message, isSpecial = false) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    let toastClass = 'score-toast';
    if (message.includes('Streak')) toastClass += ' streak';
    if (isSpecial) toastClass += ' gold';

    toast.className = toastClass;
    toast.innerText = message;
    container.appendChild(toast);

    setTimeout(() => toast.remove(), 1600);
  }

  buildGrid() {
    this.gridEl.innerHTML = '';
    const totalTiles = this.gridSize * this.gridSize;

    for (let i = 0; i < totalTiles; i++) {
      const tile = document.createElement('div');
      tile.className = 'strands-tile';
      tile.dataset.index = i;

      if (i === this.anchorIndex) {
        tile.classList.add('anchor-node');
      }

      const item = DATA_SET[i % DATA_SET.length];
      const img = document.createElement('img');
      img.src = item.img;
      tile.appendChild(img);

      this.gridEl.appendChild(tile);
    }
  }

  attachEventListeners() {
    this.gridEl.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    window.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    window.addEventListener('pointerup', () => this.handlePointerUp());
  }

  handlePointerDown(e) {
    if (this.isProcessing) return;

    const tile = e.target.closest('.strands-tile');
    if (!tile) return;

    const tileIndex = parseInt(tile.dataset.index);

    // RESET MECHANIC: Clicking any tile already in the active strand clears the path instantly
    if (this.path.includes(tileIndex)) {
      this.clearPath();
      return;
    }

    this.isDragging = true;

    if (this.path.length === 0) {
      this.addTileToPath(tileIndex);
    } else if (this.isAdjacent(this.getLastTileIndex(), tileIndex)) {
      this.addTileToPath(tileIndex);
    }
  }

  handlePointerMove(e) {
    if (!this.isDragging || this.isProcessing) return;

    const elementUnderCursor = document.elementFromPoint(e.clientX, e.clientY);
    const tile = elementUnderCursor?.closest('.strands-tile');

    if (tile) {
      const tileIndex = parseInt(tile.dataset.index);
      if (!this.path.includes(tileIndex) && this.isAdjacent(this.getLastTileIndex(), tileIndex)) {
        this.addTileToPath(tileIndex);
      }
    }
  }

  handlePointerUp() {
    this.isDragging = false;
  }

  isAdjacent(index1, index2) {
    if (index1 === null) return true;

    const r1 = Math.floor(index1 / this.gridSize);
    const c1 = index1 % this.gridSize;
    const r2 = Math.floor(index2 / this.gridSize);
    const c2 = index2 % this.gridSize;

    const rowDiff = Math.abs(r1 - r2);
    const colDiff = Math.abs(c1 - c2);

    return rowDiff <= 1 && colDiff <= 1 && !(rowDiff === 0 && colDiff === 0);
  }

  addTileToPath(index) {
    this.path.push(index);
    this.render();

    // Auto-check solution when target strand length is reached
    if (this.path.length === this.targetPathLength) {
      this.isDragging = false;
      this.validatePath();
    }
  }

  getLastTileIndex() {
    return this.path.length > 0 ? this.path[this.path.length - 1] : null;
  }

  clearPath() {
    this.path = [];
    this.feedbackEl.innerText = "";
    this.render();
  }

  render() {
    const tiles = this.gridEl.querySelectorAll('.strands-tile');
    tiles.forEach((tile, idx) => {
      tile.classList.remove('selected', 'active-head');
      if (this.path.includes(idx)) {
        tile.classList.add('selected');
      }
      if (this.path.length > 0 && this.path[this.path.length - 1] === idx) {
        tile.classList.add('active-head');
      }
    });

    this.drawPathLines();
  }

  drawPathLines() {
  this.svgEl.innerHTML = '';
  if (this.path.length < 2) return;

  const containerRect = document.getElementById('grid-container').getBoundingClientRect();
  let points = [];

  // Calculate center coordinates for every selected tile
  this.path.forEach(idx => {
    const tile = this.gridEl.children[idx];
    const rect = tile.getBoundingClientRect();

    const x = rect.left + rect.width / 2 - containerRect.left;
    const y = rect.top + rect.height / 2 - containerRect.top;
    points.push(`${x},${y}`);
  });

  // Polyline for straight dot-to-dot line segments
  const polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  polyline.setAttribute('points', points.join(' '));
  polyline.setAttribute('class', 'path-line');
  
  // EXPLICIT: Disable fill so it never closes into a 2D filled polygon/mesh
  polyline.setAttribute('fill', 'none');

  this.svgEl.appendChild(polyline);
}

  validatePath() {
    this.isProcessing = true;
    const isCorrect = JSON.stringify(this.path) === JSON.stringify(this.correctSolution);

    if (isCorrect) {
      this.currentStreak++;
      let points = 500;
      if (this.currentStreak > 1) {
        points += (this.currentStreak - 1) * 150;
        this.showToast(`🔥 ${this.currentStreak} Streak! +${points}`, true);
      } else {
        this.showToast(`+${points} Path Solved!`, true);
      }

      this.currentScore += points;
      this.updateScoreUI();
      this.feedbackEl.innerText = "🎉 Perfect Neural Strand!";

      setTimeout(() => {
        this.clearPath();
        this.isProcessing = false;
      }, 1500);

    } else {
      this.currentStreak = 0;
      this.feedbackEl.innerText = "❌ Incorrect path. Try again!";
      this.showToast("Path Incorrect");

      setTimeout(() => {
        this.clearPath();
        this.isProcessing = false;
      }, 1200);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new StrandsGame();
});