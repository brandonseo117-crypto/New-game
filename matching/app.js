class ImageMatchingGame {
  constructor(leftColId, rightColId) {
    const leftEl = document.getElementById(leftColId);
    const rightEl = document.getElementById(rightColId);

    if (!leftEl || !rightEl) {
      throw new Error('Column elements not found in DOM.');
    }

    this.leftColumn = leftEl;
    this.rightColumn = rightEl;

    this.selectedSynth = null;
    this.selectedNatural = null;

    this.pairCounter = 1;
    this.isProcessing = false;

    this.init();
  }

  init() {
    // Populate initial 4 pairs
    for (let i = 0; i < 4; i++) {
      this.addNewPair();
    }
  }

  addNewPair() {
    const pairId = this.pairCounter++;

    // Picsum placeholder URLs
    const synthUrl = `https://picsum.photos/seed/synth_${pairId}_${Math.random()}/400/300`;
    const naturalUrl = `https://picsum.photos/seed/nat_${pairId}_${Math.random()}/400/300`;

    const synthCard = this.createCard({ id: Date.now(), pairId, type: 'synth', url: synthUrl });
    const naturalCard = this.createCard({ id: Date.now() + 1, pairId, type: 'natural', url: naturalUrl });

    this.leftColumn.appendChild(synthCard);

    // Randomize right column insertion order
    const rightChildren = Array.from(this.rightColumn.children);
    if (rightChildren.length === 0 || Math.random() > 0.5) {
      this.rightColumn.appendChild(naturalCard);
    } else {
      const randomIndex = Math.floor(Math.random() * rightChildren.length);
      this.rightColumn.insertBefore(naturalCard, rightChildren[randomIndex]);
    }
  }

  createCard(item) {
    const card = document.createElement('div');
    // Add 'newly-added' for the entry animation
    card.className = 'card newly-added';
    card.dataset.pairId = item.pairId.toString();
    card.dataset.type = item.type;

    const img = document.createElement('img');
    img.src = item.url;
    img.alt = `${item.type} stimulus`;

    card.appendChild(img);

    // Clean up the entry class after animation completes (400ms)
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
      // Match found
      this.isProcessing = true;

      synth.element.classList.remove('selected');
      natural.element.classList.remove('selected');

      synth.element.classList.add('matched');
      natural.element.classList.add('matched');

      this.selectedSynth = null;
      this.selectedNatural = null;

      // Remove matched pair and insert a new pair after delay
      setTimeout(() => {
        synth.element.remove();
        natural.element.remove();

        this.addNewPair();
        this.isProcessing = false;
      }, 1200);

    } else {
      // Incorrect match
      this.isProcessing = true;

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
}

// Instantiate task when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new ImageMatchingGame('left-column', 'right-column');
});