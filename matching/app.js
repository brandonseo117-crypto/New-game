class ImageMatchingGame {
  constructor(leftColId, rightColId) {
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

    this.pairCounter = 1;
    this.score = 0;
    this.streak = 0;
    this.isProcessing = false;

    this.init();
  }

  init() {
    for (let i = 0; i < 5; i++) {
      this.addNewPair();
    }
  }

  addNewPair() {
    const pairId = this.pairCounter++;

    const synthUrl = `https://picsum.photos/seed/synth_${pairId}_${Math.random()}/400/400`;
    const naturalUrl = `https://picsum.photos/seed/nat_${pairId}_${Math.random()}/400/400`;

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
      this.isProcessing = true;
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

      // Step 1: Start 3.5-second Fade Out
      synthCard.classList.add('matched');
      naturalCard.classList.add('matched');

      this.selectedSynth = null;
      this.selectedNatural = null;

      // Generate new images for this specific slot
      const newPairId = this.pairCounter++;
      const newSynthUrl = `https://picsum.photos/seed/synth_${newPairId}_${Math.random()}/400/400`;
      const newNaturalUrl = `https://picsum.photos/seed/nat_${newPairId}_${Math.random()}/400/400`;

      // Preload new images while old ones are fading out
      const img1 = new Image();
      const img2 = new Image();
      img1.src = newSynthUrl;
      img2.src = newNaturalUrl;

      // Step 2: Wait 3.5s for fade-out to finish
      setTimeout(() => {
        // Update image sources and data attributes in-place
        const synthImg = synthCard.querySelector('img');
        const naturalImg = naturalCard.querySelector('img');

        synthImg.src = newSynthUrl;
        naturalImg.src = newNaturalUrl;

        synthCard.dataset.pairId = newPairId.toString();
        naturalCard.dataset.pairId = newPairId.toString();

        // Reset matched state and set up fade-in
        synthCard.classList.remove('matched');
        naturalCard.classList.remove('matched');
        synthCard.classList.add('fade-in');
        naturalCard.classList.add('fade-in');

        // Force a browser reflow before triggering fade-in transition
        void synthCard.offsetWidth;

        // Step 3: Start 3.5-second Fade In
        synthCard.classList.add('fading-in');
        naturalCard.classList.add('fading-in');

        // Clean up animation classes after fade-in finishes (3.5s)
        setTimeout(() => {
          synthCard.classList.remove('fade-in', 'fading-in');
          naturalCard.classList.remove('fade-in', 'fading-in');
          this.isProcessing = false;
        }, 3500);

      }, 3500);

    } else {
      // Incorrect Match -> Reset Streak
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
      }, 600);
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