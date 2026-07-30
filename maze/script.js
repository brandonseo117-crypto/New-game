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
    this.gridSize = 4;
    this.anchorIndex = 0;
    this.targetPathLength = 4;

    this.gridEl = document.getElementById('strands-grid');
    this.svgEl = document.getElementById('path-overlay');
    this.feedbackEl = document.getElementById('feedback');
    this.scoreDisplayEl = document.getElementById('score-display');

    this.path = [];
    this.lockedPath = [];
    this.isDragging = false;
    this.isProcessing = false;
    this.currentScore = 0;
    this.currentStreak = 0;

    this.correctSolution = [0, 1, 5, 10];

    // ATTACH LISTENERS EXACTLY ONCE IN CONSTRUCTOR
    this.attachEventListeners();
    this.init();
  }

  init() {
    this.path = [];
    this.lockedPath = [];
    this.isDragging = false;
    this.isProcessing = false;
    this.feedbackEl.innerText = "";
    this.updateScoreUI();

    this.buildGrid();
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
    if (this.gridEl) {
      this.gridEl.style.touchAction = 'none';
      this.gridEl.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    }
    window.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    window.addEventListener('pointerup', () => this.handlePointerUp());
  }

  handlePointerDown(e) {
    if (this.isProcessing) return;

    const tile = e.target.closest('.strands-tile');
    if (!tile) return;

    const tileIndex = parseInt(tile.dataset.index);
    const lastIndex = this.getLastTileIndex();

    // 1. TAP TO UNDO: Tapping current head (if not locked) removes it
    if (
      tileIndex === lastIndex && 
      !this.lockedPath.includes(tileIndex) && 
      this.path.length > this.lockedPath.length
    ) {
      this.path.pop();
      this.render();
      return;
    }

    // 2. TAP TO REVERT: Tapping an earlier unlocked tile trims the path back to it
    if (this.path.includes(tileIndex) && !this.lockedPath.includes(tileIndex)) {
      const existingIdx = this.path.indexOf(tileIndex);
      this.path = this.path.slice(0, existingIdx + 1);
      this.render();
      return;
    }

    // 3. ADD NEXT STEP (TAP OR DRAG)
    if (this.path.length === 0) {
      this.isDragging = true;
      this.addTileToPath(tileIndex);
    } else if (this.isAdjacent(lastIndex, tileIndex) && !this.path.includes(tileIndex)) {
      this.isDragging = true;
      this.addTileToPath(tileIndex);
    }
  }

  handlePointerMove(e) {
    if (!this.isDragging || this.isProcessing) return;

    const elementUnderCursor = document.elementFromPoint(e.clientX, e.clientY);
    const tile = elementUnderCursor?.closest('.strands-tile');

    if (tile) {
      const tileIndex = parseInt(tile.dataset.index);

      // Backtrack drag
      if (
        this.path.length > 1 && 
        tileIndex === this.path[this.path.length - 2] &&
        !this.lockedPath.includes(this.path[this.path.length - 1])
      ) {
        this.path.pop();
        this.render();
        return;
      }

      // Forward step drag
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

    // Lock correct steps
    const stepIdx = this.path.length - 1;
    if (this.path[stepIdx] === this.correctSolution[stepIdx]) {
      if (!this.lockedPath.includes(index)) {
        this.lockedPath.push(index);
      }
    }

    this.render();

    if (this.path.length === this.targetPathLength) {
      this.isDragging = false;
      this.validatePath();
    }
  }

  getLastTileIndex() {
    return this.path.length > 0 ? this.path[this.path.length - 1] : null;
  }

  clearUnlockedPath() {
    this.path = [...this.lockedPath];
    this.render();
  }

  render() {
    const tiles = this.gridEl.querySelectorAll('.strands-tile');
    tiles.forEach((tile, idx) => {
      tile.classList.remove('selected', 'active-head', 'locked-node');
      
      if (this.lockedPath.includes(idx)) {
        tile.classList.add('selected', 'locked-node');
      } else if (this.path.includes(idx)) {
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
    
    for (let i = 0; i < this.path.length - 1; i++) {
      const fromIdx = this.path[i];
      const toIdx = this.path[i + 1];

      const tileA = this.gridEl.children[fromIdx];
      const tileB = this.gridEl.children[toIdx];

      if (!tileA || !tileB) continue;

      const rectA = tileA.getBoundingClientRect();
      const rectB = tileB.getBoundingClientRect();

      const x1 = rectA.left + rectA.width / 2 - containerRect.left;
      const y1 = rectA.top + rectA.height / 2 - containerRect.top;
      const x2 = rectB.left + rectB.width / 2 - containerRect.left;
      const y2 = rectB.top + rectB.height / 2 - containerRect.top;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x1);
      line.setAttribute('y1', y1);
      line.setAttribute('x2', x2);
      line.setAttribute('y2', y2);

      const isCorrectStep = 
        this.correctSolution[i] === fromIdx && 
        this.correctSolution[i + 1] === toIdx;

      if (isCorrectStep) {
        line.setAttribute('class', 'path-line line-hot');
      } else {
        line.setAttribute('class', 'path-line line-cold');
      }

      this.svgEl.appendChild(line);
    }
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

      // Ensure all nodes in the path are marked as locked so they highlight properly
      this.lockedPath = [...this.path];
      this.render();

      // Keep this.isProcessing = true so the completed strand stays locked 
      // and frozen on screen permanently without calling this.init()!

    } else {
      this.currentStreak = 0;
      this.feedbackEl.innerText = "❌ Incorrect path. Try again!";
      this.showToast("Path Incorrect");

      setTimeout(() => {
        this.clearUnlockedPath();
        this.isProcessing = false;
      }, 800);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new StrandsGame();
});