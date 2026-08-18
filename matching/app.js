const CUSTOM_IMAGE_PAIRS = [];

class ImageMatchingGame {
  constructor(leftColId, rightColId, options = {}) {
    const leftEl = document.getElementById(leftColId);
    const rightEl = document.getElementById(rightColId);

    if (!leftEl || !rightEl) {
      throw new Error('Column elements not found in DOM.');
    }

    this.leftColumn = leftEl;
    this.rightColumn = rightEl;
    this.toastContainer = document.getElementById('toast-container');
    this.scoreDisplay = document.getElementById('score-display');
    this.streakDisplay = document.getElementById('streak-display');

    this.slotCount = 5;
    this.leftSlots = Array(this.slotCount).fill(null);
    this.rightSlots = Array(this.slotCount).fill(null);
    this.leftSlotEls = [];
    this.rightSlotEls = [];
    this.activePairKeys = new Set();

    this.selectedLeftIndex = null;
    this.selectedRightIndex = null;
    this.score = 0;
    this.streak = 0;
    this.isProcessing = false;

    this.customPairs = Array.isArray(options.customPairs) ? options.customPairs : CUSTOM_IMAGE_PAIRS;
    this.nextCustomPairIndex = 0;
    this.pairCounter = 1;

    this.initSlots();
    this.initBoard();
  }

  initSlots() {
    this.leftColumn.innerHTML = '';
    this.rightColumn.innerHTML = '';

    for (let index = 0; index < this.slotCount; index += 1) {
      const leftSlot = document.createElement('div');
      leftSlot.className = 'slot';
      leftSlot.dataset.index = index;
      leftSlot.addEventListener('click', () => this.handleSlotClick(index, 'left'));
      this.leftColumn.appendChild(leftSlot);
      this.leftSlotEls.push(leftSlot);

      const rightSlot = document.createElement('div');
      rightSlot.className = 'slot';
      rightSlot.dataset.index = index;
      rightSlot.addEventListener('click', () => this.handleSlotClick(index, 'right'));
      this.rightColumn.appendChild(rightSlot);
      this.rightSlotEls.push(rightSlot);
    }
  }

  initBoard() {
    const leftIndices = Array.from({ length: this.slotCount }, (_, index) => index);
    const rightIndices = Array.from({ length: this.slotCount }, (_, index) => index);
    this.shuffleArray(leftIndices);
    this.shuffleArray(rightIndices);

    for (let i = 0; i < this.slotCount; i += 1) {
      if (leftIndices[i] === rightIndices[i]) {
        const swapWith = i === this.slotCount - 1 ? i - 1 : i + 1;
        [rightIndices[i], rightIndices[swapWith]] = [rightIndices[swapWith], rightIndices[i]];
      }
      this.spawnPairAt(leftIndices[i], rightIndices[i], { fadeIn: true });
    }
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  getNextPair() {
    if (this.customPairs.length === 0) {
      const pairId = this.pairCounter++;
      const num = Math.floor(Math.random() * 219);
      const synthUrl = `imagesformatching/neuron${num}/pref.jpg`;
      const naturalUrl = `imagesformatching/neuron${num}/preflvl2.jpg`;
      return { pairId, synthUrl, naturalUrl };
    }

    const index = this.nextCustomPairIndex % this.customPairs.length;
    const pair = this.customPairs[index];
    this.nextCustomPairIndex += 1;
    const pairId = this.pairCounter++;
    return { pairId, synthUrl: pair.synth, naturalUrl: pair.natural };
  }

  getPairKey(pair) {
    return `${pair.synthUrl}|${pair.naturalUrl}`;
  }

  getNextUniquePair() {
    if (this.customPairs.length === 0) {
      const maxAttempts = 100;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const next = this.getNextPair();
        const pairKey = this.getPairKey(next);
        if (!this.activePairKeys.has(pairKey)) {
          return { ...next, pairKey };
        }
      }
      const fallback = this.getNextPair();
      return { ...fallback, pairKey: this.getPairKey(fallback) };
    }

    const availablePairs = this.customPairs.filter(pair => !this.activePairKeys.has(`${pair.synth}|${pair.natural}`));
    const chosen = availablePairs.length > 0
      ? availablePairs[Math.floor(Math.random() * availablePairs.length)]
      : this.customPairs[this.nextCustomPairIndex % this.customPairs.length];

    this.nextCustomPairIndex += 1;
    const pairId = this.pairCounter++;
    const synthUrl = chosen.synth;
    const naturalUrl = chosen.natural;
    const pairKey = this.getPairKey({ synthUrl, naturalUrl });
    return { pairId, synthUrl, naturalUrl, pairKey };
  }

  spawnPairAt(leftIndex, rightIndex, options = {}) {
    const pair = this.getNextUniquePair();
    this.leftSlots[leftIndex] = {
      pairId: pair.pairId,
      pairKey: pair.pairKey,
      imageUrl: pair.synthUrl,
    };
    this.rightSlots[rightIndex] = {
      pairId: pair.pairId,
      pairKey: pair.pairKey,
      imageUrl: pair.naturalUrl,
    };
    this.activePairKeys.add(pair.pairKey);

    this.renderSlot(leftIndex, 'left', options);
    this.renderSlot(rightIndex, 'right', options);
  }

  handleSlotClick(index, side) {
    if (this.isProcessing) return;

    if (side === 'left') {
      this.selectLeftSlot(index);
    } else {
      this.selectRightSlot(index);
    }
  }

  selectLeftSlot(index) {
    if (!this.leftSlots[index]) return;

    if (this.selectedLeftIndex === index) {
      this.deselectSlot(index, 'left');
      return;
    }

    if (this.selectedLeftIndex !== null) {
      this.deselectSlot(this.selectedLeftIndex, 'left');
    }

    this.selectedLeftIndex = index;
    const card = this.getSlotCardElement(index, 'left');
    if (card) card.classList.add('selected');
    this.tryMatch();
  }

  selectRightSlot(index) {
    if (!this.rightSlots[index]) return;

    if (this.selectedRightIndex === index) {
      this.deselectSlot(index, 'right');
      return;
    }

    if (this.selectedRightIndex !== null) {
      this.deselectSlot(this.selectedRightIndex, 'right');
    }

    this.selectedRightIndex = index;
    const card = this.getSlotCardElement(index, 'right');
    if (card) card.classList.add('selected');
    this.tryMatch();
  }

  deselectSlot(index, side) {
    const card = this.getSlotCardElement(index, side);
    if (card) card.classList.remove('selected');

    if (side === 'left' && this.selectedLeftIndex === index) {
      this.selectedLeftIndex = null;
    }
    if (side === 'right' && this.selectedRightIndex === index) {
      this.selectedRightIndex = null;
    }
  }

  clearSelection() {
    if (this.selectedLeftIndex !== null) {
      this.deselectSlot(this.selectedLeftIndex, 'left');
    }
    if (this.selectedRightIndex !== null) {
      this.deselectSlot(this.selectedRightIndex, 'right');
    }
    this.selectedLeftIndex = null;
    this.selectedRightIndex = null;
  }

  tryMatch() {
    if (this.selectedLeftIndex === null || this.selectedRightIndex === null) return;

    const leftTile = this.leftSlots[this.selectedLeftIndex];
    const rightTile = this.rightSlots[this.selectedRightIndex];

    if (!leftTile || !rightTile) {
      this.clearSelection();
      return;
    }

    if (leftTile.pairId === rightTile.pairId) {
      this.handleMatch(this.selectedLeftIndex, this.selectedRightIndex);
    } else {
      this.handleMismatch();
    }
  }

  handleMismatch() {
    if (this.selectedLeftIndex !== null) {
      const leftCard = this.getSlotCardElement(this.selectedLeftIndex, 'left');
      if (leftCard) leftCard.classList.add('wrong');
    }
    if (this.selectedRightIndex !== null) {
      const rightCard = this.getSlotCardElement(this.selectedRightIndex, 'right');
      if (rightCard) rightCard.classList.add('wrong');
    }

    this.isProcessing = true;
    this.streak = 0;
    this.updateStatsDisplay();

    setTimeout(() => {
      if (this.selectedLeftIndex !== null) {
        const leftCard = this.getSlotCardElement(this.selectedLeftIndex, 'left');
        if (leftCard) leftCard.classList.remove('selected', 'wrong');
      }
      if (this.selectedRightIndex !== null) {
        const rightCard = this.getSlotCardElement(this.selectedRightIndex, 'right');
        if (rightCard) rightCard.classList.remove('selected', 'wrong');
      }
      this.clearSelection();
      this.isProcessing = false;
    }, 400);
  }

  handleMatch(leftIndex, rightIndex) {
    const leftCard = this.getSlotCardElement(leftIndex, 'left');
    const rightCard = this.getSlotCardElement(rightIndex, 'right');
    const matchedPairKey = this.leftSlots[leftIndex].pairKey;

    this.streak += 1;
    const pointsEarned = 100 + (this.streak - 1) * 50;
    this.score += pointsEarned;
    this.updateStatsDisplay();

    const toastText = this.streak > 1 ? `🔥 ${this.streak} Streak! (+${pointsEarned})` : `+${pointsEarned}`;
    this.showToast(toastText);

    if (leftCard) {
      leftCard.classList.remove('selected');
      leftCard.classList.add('matched');
    }
    if (rightCard) {
      rightCard.classList.remove('selected');
      rightCard.classList.add('matched');
    }

    this.clearSelection();
    this.activePairKeys.delete(matchedPairKey);
    this.isProcessing = false;

    if (leftCard) {
      requestAnimationFrame(() => {
        leftCard.classList.add('fade-out');
      });
    }
    if (rightCard) {
      requestAnimationFrame(() => {
        rightCard.classList.add('fade-out');
      });
    }

    setTimeout(() => {
      this.leftSlots[leftIndex] = null;
      this.rightSlots[rightIndex] = null;
      this.renderSlot(leftIndex, 'left');
      this.renderSlot(rightIndex, 'right');
      this.refillEmptySlots();
    }, 1750);
  }

  refillEmptySlots() {
    const emptyLeftIndices = this.leftSlots
      .map((value, index) => (value === null ? index : null))
      .filter(index => index !== null);
    const emptyRightIndices = this.rightSlots
      .map((value, index) => (value === null ? index : null))
      .filter(index => index !== null);

    while (emptyLeftIndices.length > 0 && emptyRightIndices.length > 0) {
      const { leftIndex, rightIndex } = this.pickRandomSlotPair(emptyLeftIndices, emptyRightIndices);
      emptyLeftIndices.splice(emptyLeftIndices.indexOf(leftIndex), 1);
      emptyRightIndices.splice(emptyRightIndices.indexOf(rightIndex), 1);
      this.spawnPairAt(leftIndex, rightIndex, { fadeIn: true });
    }
  }

  pickRandomSlotPair(leftIndices, rightIndices) {
    const leftIndex = this.pickRandomSlot(leftIndices);
    let rightIndex = this.pickRandomSlot(rightIndices);

    if (leftIndex === rightIndex && leftIndices.length > 1 && rightIndices.length > 1) {
      const alternateRight = rightIndices.find(index => index !== leftIndex);
      if (alternateRight !== undefined) {
        rightIndex = alternateRight;
      } else {
        const alternateLeft = leftIndices.find(index => index !== rightIndex);
        if (alternateLeft !== undefined) {
          return { leftIndex: alternateLeft, rightIndex };
        }
      }
    }

    return { leftIndex, rightIndex };
  }

  pickRandomSlot(slotList) {
    return slotList[Math.floor(Math.random() * slotList.length)];
  }

  getSlotCardElement(index, side) {
    const slotEl = side === 'left' ? this.leftSlotEls[index] : this.rightSlotEls[index];
    return slotEl ? slotEl.querySelector('.card') : null;
  }

  createCard(state, side, options = {}) {
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.pairId = state.pairId.toString();
    card.dataset.side = side;

    const img = document.createElement('img');
    img.src = state.imageUrl;
    img.alt = `${side} stimulus`;
    card.appendChild(img);

    if (options.fadeIn) {
      card.classList.add('fade-in');
    }

    return card;
  }

  renderSlot(index, side, options = {}) {
    const slotEl = side === 'left' ? this.leftSlotEls[index] : this.rightSlotEls[index];
    if (!slotEl) return;

    slotEl.innerHTML = '';
    slotEl.className = 'slot';

    const state = side === 'left' ? this.leftSlots[index] : this.rightSlots[index];
    if (!state) {
      slotEl.classList.add('empty');
      slotEl.onclick = null;
      return;
    }

    const card = this.createCard(state, side, { fadeIn: options.fadeIn });
    slotEl.appendChild(card);

    if (options.fadeIn) {
      requestAnimationFrame(() => {
        void card.offsetWidth;
        card.classList.add('visible');
      });
    }
  }

  updateStatsDisplay() {
    if (this.scoreDisplay) this.scoreDisplay.textContent = this.score;
    if (this.streakDisplay) this.streakDisplay.textContent = this.streak;
  }

  showToast(text) {
    if (!this.toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `score-toast ${this.streak > 1 ? 'streak' : ''}`;
    toast.textContent = text;

    this.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 1200);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ImageMatchingGame('left-column', 'right-column');
});

// ==================== HOW TO PLAY MODAL (matching) ====================
(function() {
  const howToPlayModal = document.getElementById('how-to-play-modal');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const gotItBtn = document.getElementById('got-it-btn');

  function openHowToPlayModal() {
    if (howToPlayModal) howToPlayModal.classList.remove('hidden');
  }

  function closeHowToPlayModal() {
    if (howToPlayModal) howToPlayModal.classList.add('hidden');
  }

  if (closeModalBtn) closeModalBtn.addEventListener('click', closeHowToPlayModal);
  if (gotItBtn) gotItBtn.addEventListener('click', closeHowToPlayModal);

  if (howToPlayModal) {
    howToPlayModal.addEventListener('click', (e) => {
      if (e.target === howToPlayModal) closeHowToPlayModal();
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    requestAnimationFrame(() => openHowToPlayModal());
  });
})();
