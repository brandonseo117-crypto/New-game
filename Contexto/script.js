// ==========================================
// 1. GAME DATA (Rank Mappings)
// ==========================================
const imageRanks = {
  "image1": 1,   // WINNER!
  "image2": 5,
  "image3": 12,
  "image4": 2,
  "image5": 16,
  "image6": 8,
  "image7": 3,
  "image8": 14,
  "image9": 10,
  "image10": 4,
  "image11": 15,
  "image12": 7,
  "image13": 11,
  "image14": 6,
  "image15": 9,
  "image16": 13
};

let totalGuesses = 0;
let gameOver = false;
let guessedList = []; // Array of guessed objects

// ==========================================
// 2. DOM ELEMENTS & SETUP
// ==========================================
const pickerContainer = document.getElementById('imagePicker');
const options = document.querySelectorAll('.option');

// Build structured bottom popup bar container
const popupContainer = document.createElement('div');
popupContainer.id = 'bottomPopupBar';
popupContainer.className = 'bottom-popup-bar hidden';
popupContainer.innerHTML = `
  <div class="bar-header">
    <div class="bar-title">Guesses History</div>
    <div id="guessCount" class="bar-counter">Total Guesses: 0</div>
  </div>
  <div id="popupList" class="bar-items-container"></div>
`;
document.body.appendChild(popupContainer);

const popupList = document.getElementById('popupList');
const guessCountText = document.getElementById('guessCount');

// ==========================================
// 3. SELECTION & RANK LOGIC
// ==========================================
options.forEach(option => {
  const val = option.getAttribute('data-value');
  const rank = imageRanks[val] || 99;
  const imgSrc = option.querySelector('img').src;

  option.addEventListener('click', () => {
    if (gameOver) return;

    // Highlight selected option in scroll picker
    options.forEach(opt => opt.classList.remove('selected'));
    option.classList.add('selected');

    // Smoothly center selected image
    option.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest'
    });

    // Check if already guessed
    const alreadyGuessed = guessedList.some(item => item.val === val);

    if (!alreadyGuessed) {
      totalGuesses++;
      guessCountText.innerText = `Total Guesses: ${totalGuesses}`;

      // Store guess
      guessedList.push({ val, rank, imgSrc });

      // Sort by best rank (#1 comes first)
      guessedList.sort((a, b) => a.rank - b.rank);

      // Render structured bar items
      renderBarItems();

      if (rank === 1) {
        gameOver = true;
        setTimeout(() => {
          alert(`You found the target image in ${totalGuesses} guesses!`);
        }, 150);
      }
    }
  });
});

// Render function for the structured bar cards
function renderBarItems() {
  popupContainer.classList.remove('hidden');
  popupList.innerHTML = '';

  guessedList.forEach(item => {
    const card = document.createElement('div');
    card.className = `bar-card ${getRankColorClass(item.rank)}`;
    
    card.innerHTML = `
      <div class="card-img-wrapper">
        <img src="${item.imgSrc}" alt="${item.val}">
      </div>
      <div class="card-rank-badge">#${item.rank}</div>
    `;

    popupList.appendChild(card);
  });
}

function getRankColorClass(rank) {
  if (rank === 1) return 'rank-top'; // Green
  if (rank <= 5) return 'rank-mid';  // Yellow
  return 'rank-low';                 // Red
}

//4. scrolling

let targetScrollLeft = pickerContainer.scrollLeft;
let isScrolling = false;

pickerContainer.addEventListener('wheel', (evt) => {
  evt.preventDefault();

  // Scroll multiplier (Increase this number if you want it even faster!)
  const scrollSpeed = 2.5; 
  
  // Calculate new target position
  targetScrollLeft += evt.deltaY * scrollSpeed;

  // Clamp scrolling within bounds
  const maxScroll = pickerContainer.scrollWidth - pickerContainer.clientWidth;
  targetScrollLeft = Math.max(0, Math.min(targetScrollLeft, maxScroll));

  // Smooth animation frame loop
  if (!isScrolling) {
    smoothScrollLoop();
  }
});

function smoothScrollLoop() {
  isScrolling = true;

  // Linear interpolation (0.15 controls the softness/elasticity)
  const distance = targetScrollLeft - pickerContainer.scrollLeft;
  pickerContainer.scrollLeft += distance * 0.15;

  // Continue animating until we get close enough to the target
  if (Math.abs(distance) > 0.5) {
    requestAnimationFrame(smoothScrollLoop);
  } else {
    pickerContainer.scrollLeft = targetScrollLeft;
    isScrolling = false;
  }
}

// ==========================================
// 5. GUESS HISTORY BAR SCROLLING LOGIC
// ==========================================

// Smooth Mouse Wheel Scrolling for Bottom Bar
let barTargetScrollLeft = 0;
let isBarScrolling = false;

popupList.addEventListener('wheel', (evt) => {
  evt.preventDefault();

  const scrollSpeed = 2.5; 
  barTargetScrollLeft += evt.deltaY * scrollSpeed;

  const maxScroll = popupList.scrollWidth - popupList.clientWidth;
  barTargetScrollLeft = Math.max(0, Math.min(barTargetScrollLeft, maxScroll));

  if (!isBarScrolling) {
    smoothBarScrollLoop();
  }
});

function smoothBarScrollLoop() {
  isBarScrolling = true;

  const distance = barTargetScrollLeft - popupList.scrollLeft;
  popupList.scrollLeft += distance * 0.15;

  if (Math.abs(distance) > 0.5) {
    requestAnimationFrame(smoothBarScrollLoop);
  } else {
    popupList.scrollLeft = barTargetScrollLeft;
    isBarScrolling = false;
  }
}

// Click-and-Drag Scrolling for Bottom Bar
let isBarDown = false;
let barStartX;
let barScrollLeft;

popupList.addEventListener('mousedown', (e) => {
  isBarDown = true;
  popupList.classList.add('dragging');
  barStartX = e.pageX - popupList.offsetLeft;
  barScrollLeft = popupList.scrollLeft;
});

popupList.addEventListener('mouseleave', () => {
  isBarDown = false;
  popupList.classList.remove('dragging');
});

popupList.addEventListener('mouseup', () => {
  isBarDown = false;
  popupList.classList.remove('dragging');
});

popupList.addEventListener('mousemove', (e) => {
  if (!isBarDown) return;
  e.preventDefault();
  const x = e.pageX - popupList.offsetLeft;
  const walk = (x - barStartX) * 2;
  popupList.scrollLeft = barScrollLeft - walk;
  barTargetScrollLeft = popupList.scrollLeft; // Sync wheel target with drag position
});