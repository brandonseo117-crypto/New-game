// ==========================================
// 1. GAME DATA (Rank Mappings)
// ==========================================
// Rank 1 = The winning image (2nd highest neuron activation)
const imageRanks = {
  "image1": 1,  // WINNER!
  "image2": 5,
  "image3": 12,
  "image4": 2,
  "image5": 20
};

let totalGuesses = 0;
let gameOver = false;
let guessedList = []; // Keeps track of guesses made so far

// ==========================================
// 2. DOM ELEMENTS & SETUP
// ==========================================
const pickerContainer = document.getElementById('imagePicker');
const options = document.querySelectorAll('.option');

// Create the Contexto-style bottom pop-up container dynamically
const popupContainer = document.createElement('div');
popupContainer.id = 'bottomPopup';
popupContainer.className = 'bottom-popup hidden';
popupContainer.innerHTML = `
  <div class="popup-header">
    <span class="popup-title">Guesses History</span>
    <span id="guessCount">Guesses: 0</span>
  </div>
  <div id="popupList" class="popup-list"></div>
`;
document.body.appendChild(popupContainer);

const popupList = document.getElementById('popupList');
const guessCountText = document.getElementById('guessCount');

// ==========================================
// 3. CLICK & GUESS REVEAL LOGIC
// ==========================================
options.forEach(option => {
  const val = option.getAttribute('data-value');
  const rank = imageRanks[val] || 99;
  const imgSrc = option.querySelector('img').src;

  option.addEventListener('click', () => {
    if (gameOver) return;

    // Highlight selected state in scrollbar
    options.forEach(opt => opt.classList.remove('selected'));
    option.classList.add('selected');

    // Smoothly center the clicked image
    option.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest'
    });

    // Check if this image has already been guessed
    const alreadyGuessed = guessedList.some(item => item.val === val);

    if (!alreadyGuessed) {
      totalGuesses++;
      guessCountText.innerText = `Guesses: ${totalGuesses}`;

      // Add to guess history array
      guessedList.push({ val, rank, imgSrc });

      // Sort guesses by best rank (#1 at the top/left)
      guessedList.sort((a, b) => a.rank - b.rank);

      // Render the bottom pop-up bar list
      renderBottomPopup();

      if (rank === 1) {
        gameOver = true;
        setTimeout(() => {
          alert(`🎉 Winner! You found the correct image in ${totalGuesses} guesses!`);
        }, 100);
      }
    }
  });
});

// Helper function to render sorted guesses in the bottom bar
function renderBottomPopup() {
  // Show popup bar if hidden
  popupContainer.classList.remove('hidden');
  popupList.innerHTML = '';

  guessedList.forEach(item => {
    const card = document.createElement('div');
    card.className = `guess-card ${getRankColorClass(item.rank)}`;
    
    card.innerHTML = `
      <img src="${item.imgSrc}" alt="${item.val}">
      <span class="guess-rank">#${item.rank}</span>
    `;

    popupList.appendChild(card);
  });
}

// Helper to assign color code classes based on rank
function getRankColorClass(rank) {
  if (rank === 1) return 'rank-top'; // Green
  if (rank <= 5) return 'rank-mid';  // Yellow
  return 'rank-low';                 // Red
}

// ==========================================
// 4. MOUSE WHEEL HORIZONTAL SCROLLING
// ==========================================
pickerContainer.addEventListener('wheel', (evt) => {
  evt.preventDefault();
  pickerContainer.scrollLeft += evt.deltaY;
});

// ==========================================
// 5. CLICK-AND-DRAG SCROLLING
// ==========================================
let isDown = false;
let startX;
let scrollLeft;

pickerContainer.addEventListener('mousedown', (e) => {
  isDown = true;
  pickerContainer.classList.add('dragging');
  startX = e.pageX - pickerContainer.offsetLeft;
  scrollLeft = pickerContainer.scrollLeft;
});