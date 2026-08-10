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

  getNextPair() {
    if (this.customPairs.length === 0) {
      const pairId = this.pairCounter++;
      const synthUrl = `https://picsum.photos/seed/synth_${pairId}_${Math.random()}/400/400`;
      const naturalUrl = `https://picsum.photos/seed/nat_${pairId}_${Math.random()}/400/400`;
      return { pairId, synthUrl, naturalUrl };
    }

    const index = this.nextCustomPairIndex % this.customPairs.length;
    const pair = this.customPairs[index];
    this.nextCustomPairIndex += 1;
    const pairId = this.pairCounter++;
    return { pairId, synthUrl: pair.synth, naturalUrl: pair.natural };
  }

  addNewPair() {
    const { pairId, synthUrl, naturalUrl } = this.getNextPair();

    // Preload images to prevent loading flashes
    const img1 = new Image();
    const img2 = new Image();
    img1.src = synthUrl;
    img2.src = naturalUrl;

    Promise.all([
      new Promise(res => img1.onload = res),
      new Promise(res => img2.onload = res)
    ]).then(() => {
      const synthCard = this.createCard({ id: Date.now(), pairId, type: 'synth', url: synthUrl });
      const naturalCard = this.createCard({ id: Date.now() + 1, pairId, type: 'natural', url: naturalUrl });

      this.leftColumn.appendChild(synthCard);

      const rightChildren = Array.from(this.rightColumn.children);
      if (rightChildren.length === 0 || Math.random() > 0.5) {
        this.rightColumn.appendChild(naturalCard);
      } else {
        const randomIndex = Math.floor(Math.random() * rightChildren.length);
        this.rightColumn.insertBefore(naturalCard, rightChildren[randomIndex]);
      }
    });
  }

  createCard(item) {
    const card = document.createElement('div');
    card.className = 'card newly-added';
    card.dataset.pairId = item.pairId.toString();
    card.dataset.type = item.type;

    const img = document.createElement('img');
    img.src = item.url;
    img.alt = `${item.type} stimulus`;

    card.appendChild(img);

    setTimeout(() => {
      card.classList.remove('newly-added');
    }, 400);

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

      // 3. Start background smooth 3.5s transition for this specific pair slot
      const nextPair = this.getNextPair();
      this.replaceCardImageSmooth(synthCard, nextPair.synthUrl, nextPair.pairId);
      this.replaceCardImageSmooth(naturalCard, nextPair.naturalUrl, nextPair.pairId);

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