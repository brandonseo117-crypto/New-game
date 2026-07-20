const groupItems = [
    'images/image1025.jpg',
    'images/image0295.jpg',
    'images/image1316.jpg',
    'images/image0149.jpg',
    'images/image1133.jpg',
    'images/image0558.jpg',
    'images/image0362.jpg',
    'images/image1334.jpg',
    'images/image0221.jpg',
    'images/image1175.jpg',
    'images/image1567.jpg',
    'images/image0220.jpg',
    'images/image1034.jpg',
    'images/image0430.jpg',
    'images/image0376.jpg'
];

const oddItem = 'images/odd1out_1010.jpg'; 

// Game State variables
let lives = 4;
let selectedItem = null; // Tracks the currently clicked card object
let selectedCardElement = null; // Tracks the actual HTML element highlighted

const gridElement = document.getElementById('grid');
const messageElement = document.getElementById('message');
const resetBtn = document.getElementById('reset-btn');

// Create UI elements for lives and submit button dynamically
const controlsContainer = document.createElement('div');
controlsContainer.className = 'controls';

const livesDisplay = document.createElement('div');
livesDisplay.id = 'lives-display';
livesDisplay.style.margin = '10px 0';
livesDisplay.style.fontWeight = 'bold';

const submitBtn = document.createElement('button');
submitBtn.id = 'submit-btn';
submitBtn.textContent = 'Submit Answer';
submitBtn.disabled = true; // Disabled until a choice is made

// Insert them into the DOM right under the grid
gridElement.after(controlsContainer);
controlsContainer.appendChild(livesDisplay);
controlsContainer.appendChild(submitBtn);

function initGame() {
    gridElement.innerHTML = '';
    messageElement.textContent = '';
    resetBtn.style.display = 'none';
    submitBtn.style.display = 'inline-block';
    submitBtn.disabled = true;
    
    lives = 4;
    selectedItem = null;
    selectedCardElement = null;
    updateLivesUI();

    let gameSet = groupItems.map(srcPath => ({ val: srcPath, isOdd: false }));
    gameSet.push({ val: oddItem, isOdd: true });
    gameSet.sort(() => Math.random() - 0.5);

    gameSet.forEach(item => {
        const card = document.createElement('div');
        card.classList.add('card');
        
        const img = document.createElement('img');
        img.src = item.val;
        img.alt = "Game item";
        card.appendChild(img);
        
        // Handle selecting a card
        card.addEventListener('click', () => {
            if (lives <= 0) return;

            // Remove selected class from previously chosen card
            if (selectedCardElement) {
                selectedCardElement.classList.remove('selected');
            }

            // Select this card
            card.classList.add('selected');
            selectedCardElement = card;
            selectedItem = item;
            
            // Enable submit button
            submitBtn.disabled = false;
        });

        gridElement.appendChild(card);
    });
}

function updateLivesUI() {
    livesDisplay.textContent = `Lives Left: ${lives}/4`;
}

// Handle the submission logic
submitBtn.addEventListener('click', () => {
    if (!selectedItem || !selectedCardElement) return;

    // Log tracking data
    console.log('User Submitted Choice:', {
        clickedImage: selectedItem.val,
        isOddOneOut: selectedItem.isOdd,
        livesRemaining: lives,
        timestamp: new Date().toISOString()
    });

    if (selectedItem.isOdd) {
        // WIN STATE
        selectedCardElement.classList.remove('selected');
        selectedCardElement.classList.add('correct');
        messageElement.textContent = "Correct! You found the odd one out!";
        messageElement.style.color = "#16a34a";
        endGame();
    } else {
        // LOSE A LIFE STATE
        lives--;
        updateLivesUI();
        
        selectedCardElement.classList.remove('selected');
        selectedCardElement.classList.add('wrong');
        
        // Temporarily clear selection data
        selectedItem = null;
        selectedCardElement = null;
        submitBtn.disabled = true;

        if (lives <= 0) {
            // GAME OVER STATE
            messageElement.textContent = "Game Over! You ran out of lives.";
            messageElement.style.color = "#dc2626";
            endGame();
        } else {
            messageElement.textContent = "Wrong one! Try again.";
            messageElement.style.color = "#dc2626";
        }
    }
});

function endGame() {
    document.querySelectorAll('.card').forEach(card => card.style.pointerEvents = 'none');
    submitBtn.style.display = 'none';
    resetBtn.style.display = 'inline-block';
}

resetBtn.addEventListener('click', initGame);
initGame();