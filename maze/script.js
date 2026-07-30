const DATA_SET = [
  { id: 0, val: 16, img: "../imagesforgames/neuron34/img01.jpg" },
  { id: 1, val: 15, img: "../imagesforgames/neuron34/img02.jpg" },
  { id: 2, val: 14, img: "../imagesforgames/neuron2/img03.jpg" },
  { id: 3, val: 13, img: "../imagesforgames/neuron3/img04.jpg" },
  { id: 4, val: 12, img: "../imagesforgames/neuron4/img05.jpg" },
  { id: 5, val: 11, img: "../imagesforgames/neuron34/img03.jpg" },
  { id: 6, val: 10, img: "../imagesforgames/neuron5/img06.jpg" },
  { id: 7, val: 9, img: "../imagesforgames/neuron6/img07.jpg" },
  { id: 8, val: 8, img: "../imagesforgames/neuron7/img08.jpg" },
  { id: 9, val: 7, img: "../imagesforgames/neuron8/img09.jpg" },
  { id: 10, val: 6, img: "../imagesforgames/neuron34/img04.jpg" },
  { id: 11, val: 5, img: "../imagesforgames/neuron9/img10.jpg" },
  { id: 12, val: 4, img: "../imagesforgames/neuron10/img11.jpg" },
  { id: 13, val: 3, img: "../imagesforgames/neuron11/img12.jpg" },
  { id: 14, val: 2, img: "../imagesforgames/neuron12/img13.jpg"},
  { id: 15, val: 1, img: "../imagesforgames/neuron34/img05.jpg" }
];

class StrandsGame {
  constructor() {
    this.gridSize = 4;
    this.anchorIndex = 0;

    // Max tiles a player can draw on screen (flexible up to 8)
    this.maxSelectableTiles = 8; 

    this.gridEl = document.getElementById('strands-grid');
    this.svgEl = document.getElementById('path-overlay');
    this.feedbackEl = document.getElementById('feedback');
    this.scoreDisplayEl = document.getElementById('score-display');
    this.checkBtnEl = document.getElementById('check-strand-btn');

    this.path = [];
    this.lockedPath = [];
    this.isChecked = false;
    this.isDragging = false;
    this.isProcessing = false;
    this.currentScore = 0;

    this.attemptCount = 0;
    this.maxCorrectSegments = 0;

    // Daily solution strand (can be 5 to 8 tiles long!)
    this.correctSolution = [0, 1, 5, 10, 15];
    this.isLevelComplete = false;

    this.attachEventListeners();
    this.init();
  }

  // Length of the active puzzle's solution
  get targetPathLength() {
    return this.correctSolution.length;
  }

  init() {
    this.path = [];
    this.lockedPath = [];
    this.isChecked = false;
    this.isDragging = false;
    this.isProcessing = false;
    this.isLevelComplete = false; // Reset completion state
    this.attemptCount = 0;
    this.maxCorrectSegments = 0;

    // Reset button UI for a fresh level
    if (this.checkBtnEl) {
      this.checkBtnEl.innerText = "Check Strand";
      this.checkBtnEl.style.display = 'inline-block';
    }

    if (this.feedbackEl) {
      this.feedbackEl.innerText = `Find today's strand (${this.targetPathLength} tiles long)!`;
    }

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

    if (this.checkBtnEl) {
      this.checkBtnEl.addEventListener('click', () => {
        // If level is already won, button acts as "Next Level"
        if (this.isLevelComplete) {
          this.init();
          return;
        }

        // Otherwise, it acts as "Check Strand"
        if (!this.isProcessing && this.path.length >= 2) {
          this.validatePath();
        }
      });
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

    this.isChecked = false;

    // 1. Tap existing path node to slice back to it
    if (this.path.includes(tileIndex)) {
      const existingIdx = this.path.indexOf(tileIndex);
      this.path = this.path.slice(0, existingIdx + 1);
      this.isDragging = true;
      this.render();
      return;
    }

    // 2. Start path if empty
    if (this.path.length === 0) {
      this.isDragging = true;
      this.addTileToPath(tileIndex);
      return;
    }

    // 3. Add tile if adjacent up to maxSelectableTiles (8)
    if (this.isAdjacent(lastIndex, tileIndex) && this.path.length < this.maxSelectableTiles) {
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
      const lastIndex = this.getLastTileIndex();

      // Quick backtrack: Dragging back over the previous tile trims it
      if (
        this.path.length > 1 && 
        tileIndex === this.path[this.path.length - 2]
      ) {
        this.path.pop();
        this.render();
        return;
      }

      // Forward step: Add adjacent tile up to maxSelectableTiles (8)
      if (
        !this.path.includes(tileIndex) && 
        this.isAdjacent(lastIndex, tileIndex) &&
        this.path.length < this.maxSelectableTiles
      ) {
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

  isValidSegment(fromIdx, toIdx) {
    for (let i = 0; i < this.correctSolution.length - 1; i++) {
      const a = this.correctSolution[i];
      const b = this.correctSolution[i + 1];
      if ((fromIdx === a && toIdx === b) || (fromIdx === b && toIdx === a)) {
        return true;
      }
    }
    return false;
  }

  countCorrectSegments() {
    let correctCount = 0;
    for (let i = 0; i < this.path.length - 1; i++) {
      if (this.isValidSegment(this.path[i], this.path[i + 1])) {
        correctCount++;
      }
    }
    return correctCount;
  }

  calculatePoints(attempts) {
    const basePoints = 1000;
    return Math.floor(basePoints * Math.pow(0.5, attempts - 1));
  }

  addTileToPath(index) {
    this.path.push(index);
    this.render();
  }

  getLastTileIndex() {
    return this.path.length > 0 ? this.path[this.path.length - 1] : null;
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

      // Identifies the most recently selected tile at the end of the chain
      if (this.path.length > 0 && this.path[this.path.length - 1] === idx) {
        tile.classList.add('active-head');
      }
    });

    if (this.checkBtnEl) {
      this.checkBtnEl.disabled = this.path.length < 2 || this.isProcessing;
    }

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

      if (this.isChecked) {
        const isSegmentValid = this.isValidSegment(fromIdx, toIdx);
        if (isSegmentValid) {
          line.setAttribute('class', 'path-line line-correct');
        } else {
          line.setAttribute('class', 'path-line line-incorrect');
        }
      } else {
        line.setAttribute('class', 'path-line line-active');
      }

      this.svgEl.appendChild(line);
    }
  }

  validatePath() {
    this.isProcessing = true;
    this.isChecked = true;
    this.attemptCount++;
    this.render();

    const currentCorrectCount = this.countCorrectSegments();
    const isFullSolution = JSON.stringify(this.path) === JSON.stringify(this.correctSolution);

    if (isFullSolution) {
      const pointsAwarded = this.calculatePoints(this.attemptCount);
      this.currentScore += pointsAwarded;
      this.updateScoreUI();

      this.lockedPath = [...this.path];
      this.isLevelComplete = true; // Mark level as complete
      this.render();

      this.showToast(`+${pointsAwarded} pts!`, true);

      // Simple feedback text without inner buttons
      this.feedbackEl.innerText = `🎉 Solved in ${this.attemptCount} attempt(s)! +${pointsAwarded} pts`;

      // Morph the existing check button into the "Next Level" button
      if (this.checkBtnEl) {
        this.checkBtnEl.innerText = "Next Level ➔";
        this.checkBtnEl.disabled = false;
      }

    } else {
      if (currentCorrectCount > this.maxCorrectSegments) {
        const newSegmentsFound = currentCorrectCount - this.maxCorrectSegments;
        const partialPoints = newSegmentsFound * 100;
        
        this.maxCorrectSegments = currentCorrectCount;
        this.currentScore += partialPoints;
        this.updateScoreUI();

        this.feedbackEl.innerText = `👍 Found ${newSegmentsFound} new correct line(s)! +${partialPoints} pts`;
        this.showToast(`+${partialPoints} pts!`);
      } else {
        this.feedbackEl.innerText = `⚠️ Incorrect path. Try connecting different tiles!`;
        this.showToast("No New Progress");
      }

      setTimeout(() => {
        this.isChecked = false;
        this.isProcessing = false;
        this.render();
      }, 1200);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new StrandsGame();
});