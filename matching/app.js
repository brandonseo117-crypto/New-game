const CUSTOM_IMAGE_PAIRS = [
  // Add your own image pairs here.
  // Each pair must include both a `synth` and a `natural` image URL.
  // Example:
  // { synth: 'imagesformatching/images_190923_neuron0/example1.jpg', natural: 'imagesformatching/images_190923_neuron1/example1.jpg' },
];

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

    this.selectedSynth = null;
    this.selectedNatural = null;

    this.customPairs = Array.isArray(options.customPairs) ? options.customPairs : CUSTOM_IMAGE_PAIRS;
    this.nextCustomPairIndex = 0;
    this.pairCounter = 1;
    this.activePairKeys = new Set();
    this.score = 0;
    this.streak = 0;
    this.isProcessing = false;
    this.initialPairCount = this.customPairs.length > 0 ? this.customPairs.length : 5;

    this.init();
  }

  init() {
    for (let i = 0; i < this.initialPairCount; i++) {
      this.addNewPair();
    }
  }

  getPairKey(pair) {
    return `${pair.synthUrl}|${pair.naturalUrl}`;
  }

  getNextRandomPair() {
    const num = Math.floor(Math.random() * 219);
    const synthUrl = `imagesformatching/neuron${num}/pref.jpg`;
    const naturalUrl = `imagesformatching/neuron${num}/preflvl2.jpg`;
    return { pairId: this.pairCounter++, synthUrl, naturalUrl };
  }

  getNextUniqueRandomPair() {
    const maxAttempts = 50;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const pair = this.getNextRandomPair();
      const pairKey = this.getPairKey(pair);
      if (!this.activePairKeys.has(pairKey)) {
        return { ...pair, pairKey };
      }
    }

    const pair = this.getNextRandomPair();
    return { ...pair, pairKey: this.getPairKey(pair) };
  }

  getNextUniqueCustomPair() {
    const available = this.customPairs.filter(pair => !this.activePairKeys.has(`${pair.synth}|${pair.natural}`));
    const chosen = available.length > 0
      ? available[this.nextCustomPairIndex % available.length]
      : this.customPairs[this.nextCustomPairIndex % this.customPairs.length];

    this.nextCustomPairIndex += 1;
    const pairId = this.pairCounter++;
    const synthUrl = chosen.synth;
    const naturalUrl = chosen.natural;
    const pairKey = this.getPairKey({ synthUrl, naturalUrl });
    return { pairId, synthUrl, naturalUrl, pairKey };
  }

  getNextUniquePair() {
    if (this.customPairs.length === 0) {
      return this.getNextUniqueRandomPair();
    }
    return this.getNextUniqueCustomPair();
  }

  addNewPair() {
    const { pairId, synthUrl, naturalUrl, pairKey } = this.getNextUniquePair();

    // Preload images to prevent loading flashes
    const img1 = new Image();
    const img2 = new Image();
    img1.src = synthUrl;
    img2.src = naturalUrl;

    Promise.all([
      new Promise(res => img1.onload = res),
      new Promise(res => img2.onload = res)
    ]).then(() => {
      const synthCard = this.createCard({ id: Date.now() + Math.floor(Math.random() * 1000), pairId, type: 'synth', url: synthUrl, pairKey });
      const naturalCard = this.createCard({ id: Date.now() + Math.floor(Math.random() * 1000), pairId, type: 'natural', url: naturalUrl, pairKey });
      this.activePairKeys.add(pairKey);

      this.insertCardAtRandomPosition(synthCard, this.leftColumn);
      this.insertCardAtRandomPosition(naturalCard, this.rightColumn);
    });
  }

  createCard(item, options = {}) {
    const card = document.createElement('div');
    card.className = options.disableAppear ? 'card' : 'card newly-added';
    card.dataset.pairId = item.pairId.toString();
    card.dataset.type = item.type;
    card.dataset.pairKey = item.pairKey || this.getPairKey(item);

    const img = document.createElement('img');
    img.src = item.url;
    img.alt = `${item.type} stimulus`;

    card.appendChild(img);

    if (!options.disableAppear) {
      setTimeout(() => {
        card.classList.remove('newly-added');
      }, 400);
    }

    card.addEventListener('click', () => this.handleCardClick(card, item.type, item.pairId));

    return card;
  }

  handleCardClick(card, type, pairId) {
    if (this.isProcessing || card.classList.contains('matched')) return;

    if (type === 'synth') {
      if (this.selectedSynth?.element === card) {
        card.classList.remove('selected');
        this.selectedSynth = null;
        return;
      }
      if (this.selectedSynth) this.selectedSynth.element.classList.remove('selected');
      card.classList.add('selected');
      this.selectedSynth = { element: card, pairId };
    } else {
      if (this.selectedNatural?.element === card) {
        card.classList.remove('selected');
        this.selectedNatural = null;
        return;
      }
      if (this.selectedNatural) this.selectedNatural.element.classList.remove('selected');
      card.classList.add('selected');
      this.selectedNatural = { element: card, pairId };
    }

    this.checkMatch();
  }

  checkMatch() {
    if (!this.selectedSynth || !this.selectedNatural) return;

    const synth = this.selectedSynth;
    const natural = this.selectedNatural;

    if (synth.pairId === natural.pairId) {
      // Correct Match!
      this.streak++;
      const pointsEarned = 100 + (this.streak - 1) * 50;
      this.score += pointsEarned;
      this.updateStatsDisplay();

      const toastText = this.streak > 1 ? `🔥 ${this.streak} Streak! (+${pointsEarned})` : `+${pointsEarned}`;
      this.showToast(toastText);

      const synthCard = synth.element;
      const naturalCard = natural.element;

      synthCard.classList.remove('selected');
      naturalCard.classList.remove('selected');

      // 1. Mark matched so only THESE two cards are disabled
      synthCard.classList.add('matched');
      naturalCard.classList.add('matched');

      // 2. UNLOCK THE GAME IMMEDIATELY - Player can keep playing!
      this.selectedSynth = null;
      this.selectedNatural = null;
      this.isProcessing = false; 

      // 3. Remove the current pair from active tracking before respawning new cards.
      const oldPairKey = synthCard.dataset.pairKey;
      if (oldPairKey) {
        this.activePairKeys.delete(oldPairKey);
      }

      const nextPair = this.getNextUniquePair();
      // Instead of replacing images in the exact same DOM slots,
      // remove the matched cards and respawn new cards at unpredictable positions
      // so the order becomes non-deterministic (like Duolingo Match Madness).
      this.respawnCard(synthCard, nextPair.synthUrl, nextPair.naturalUrl, nextPair.pairId, nextPair.pairKey, this.leftColumn);
      this.respawnCard(naturalCard, nextPair.naturalUrl, nextPair.synthUrl, nextPair.pairId, nextPair.pairKey, this.rightColumn);

    } else {
      // Incorrect Match -> Brief 400ms flash, then unlock
      this.isProcessing = true;
      this.streak = 0;
      this.updateStatsDisplay();

      synth.element.classList.add('wrong');
      natural.element.classList.add('wrong');

      setTimeout(() => {
        synth.element.classList.remove('selected', 'wrong');
        natural.element.classList.remove('selected', 'wrong');

        this.selectedSynth = null;
        this.selectedNatural = null;
        this.isProcessing = false;
      }, 400);
    }
  }

  replaceCardImageSmooth(card, newUrl, newPairId) {
    const oldImg = card.querySelector('img');

    // Create the incoming new image
    const newImg = document.createElement('img');
    newImg.src = newUrl;
    newImg.className = 'incoming-img';

    // Preload image before inserting
    newImg.onload = () => {
      card.appendChild(newImg);

      // Force browser reflow so CSS transition registers properly
      void newImg.offsetWidth;

      // Trigger 3.5s crossfade
      oldImg.classList.add('fade-out');
      newImg.classList.add('fade-in');

      // After 3.5s transition finishes, clean up DOM and make slot active again
      setTimeout(() => {
        oldImg.remove();
        newImg.className = ''; // Make it standard card image
        card.dataset.pairId = newPairId.toString();
        card.classList.remove('matched'); // Slot is clickable again!
      }, 3500);
    };
  }

  createEmptySlot() {
    const slot = document.createElement('div');
    slot.className = 'card empty-slot';
    slot.dataset.emptySlot = 'true';
    return slot;
  }

  getRandomEmptySlot(columnEl) {
    const emptySlots = Array.from(columnEl.querySelectorAll('.card.empty-slot'));
    if (emptySlots.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * emptySlots.length);
    return emptySlots[randomIndex];
  }

  respawnCard(oldCard, newUrl, matchingUrl, newPairId, newPairKey, columnEl) {
    // Fade the old card out, then leave a placeholder slot for later respawn.
    oldCard.classList.remove('selected', 'fade-in');
    oldCard.classList.add('fade-out');

    const preloaded = new Image();
    preloaded.src = newUrl;

    setTimeout(() => {
      if (!oldCard.parentElement) return;

      const placeholder = this.createEmptySlot();
      const parent = oldCard.parentElement;
      parent.replaceChild(placeholder, oldCard);

      const newCard = this.createCard(
        { id: Date.now() + Math.floor(Math.random() * 1000), pairId: newPairId, type: oldCard.dataset.type, url: newUrl, pairKey: newPairKey },
        { disableAppear: true }
      );
      this.activePairKeys.add(newPairKey);
      newCard.classList.add('fade-in');

      const targetSlot = this.getRandomEmptySlot(columnEl) || placeholder;
      if (targetSlot.parentElement) {
        targetSlot.parentElement.replaceChild(newCard, targetSlot);
      }

      const onAnimationEnd = (event) => {
        if (event.animationName === 'fadeIn') {
          newCard.classList.remove('fade-in', 'matched');
          newCard.removeEventListener('animationend', onAnimationEnd);
        }
      };

      newCard.addEventListener('animationend', onAnimationEnd);
    }, 3000);
  }

  updateStatsDisplay() {
    if (this.scoreDisplay) this.scoreDisplay.textContent = this.score;
    if (this.streakDisplay) this.streakDisplay.textContent = this.streak;
  }

  insertCardAtRandomPosition(card, columnEl) {
    const children = Array.from(columnEl.children);
    if (children.length === 0 || Math.random() > 0.5) {
      columnEl.appendChild(card);
    } else {
      const randomIndex = Math.floor(Math.random() * children.length);
      columnEl.insertBefore(card, children[randomIndex]);
    }
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