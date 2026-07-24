// Sample Data: 8 items with true relative activation values (0 to 100)
const DATA_SET = [
    { id: 1, val: 12, img: "https://picsum.photos/seed/neuron1/100/100" },
    { id: 2, val: 25, img: "https://picsum.photos/seed/neuron2/100/100" },
    { id: 3, val: 38, img: "https://picsum.photos/seed/neuron3/100/100" },
    { id: 4, val: 45, img: "https://picsum.photos/seed/neuron4/100/100" },
    { id: 5, val: 60, img: "https://picsum.photos/seed/neuron5/100/100" },
    { id: 6, val: 72, img: "https://picsum.photos/seed/neuron6/100/100" },
    { id: 7, val: 88, img: "https://picsum.photos/seed/neuron7/100/100" },
    { id: 8, val: 95, img: "https://picsum.photos/seed/neuron8/100/100" }
];

let lockedIds = new Set();
let newlyLockedIds = new Set();
let correctTileIds = new Set(); // Stores IDs of permanently correct tiles
let pool = [];
let boardState = [];
let currentItem = null;
let phase = "PLACEMENT"; // PLACEMENT, SORTING, COMPLETE
let draggedIndex = null; 
let checkedCorrectness = false; // Controls whether red/green feedback is visible
let isSwapAnimating = false; // Prevents spam-clicking during swap transitions

// Points & Move Counters
let currentScore = 0;
let moveCount = 0;

// DOM Elements
const restartBtn = document.getElementById('restart-btn');
const stageArea = document.getElementById('stage-area');
const currentImgEl = document.getElementById('current-img');
const boardEl = document.getElementById('board');
const submitBtn = document.getElementById('submit-btn');
const feedbackEl = document.getElementById('feedback');
const scoreDisplayEl = document.getElementById('score-display');
const movesDisplayEl = document.getElementById('moves-display');

function showToast(message, isGold = false) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `score-toast ${isGold ? 'gold' : ''}`;
    toast.innerText = message;

    container.appendChild(toast);

    // Remove element after animation finishes (1.6s)
    setTimeout(() => {
        toast.remove();
    }, 1600);
};

function updateScoreUI() {
    if (scoreDisplayEl) scoreDisplayEl.innerText = `Score: ${Math.max(0, currentScore)}`;
    if (movesDisplayEl) movesDisplayEl.innerText = `Moves: ${moveCount}`;
}

function initGame() {
    lockedIds.clear();
    newlyLockedIds.clear();
    correctTileIds.clear();
    pool = [...DATA_SET].sort(() => Math.random() - 0.5);
    boardState = [];
    phase = "PLACEMENT";
    checkedCorrectness = false;
    isSwapAnimating = false;
    
    // Reset points & moves
    currentScore = 0;
    moveCount = 0;
    updateScoreUI();

    feedbackEl.innerText = "";
    submitBtn.classList.add('hidden');
    stageArea.classList.remove('hidden');
    
    // Seed initial image on board
    boardState.push(pool.pop());
    nextPlacementTurn();
}

function nextPlacementTurn() {
    if (pool.length > 0) {
        currentItem = pool.pop();
        currentImgEl.src = currentItem.img;
        renderBoard();
    } else {
        // Transition to sorting phase
        phase = "SORTING";
        stageArea.classList.add('hidden');
        submitBtn.classList.remove('hidden');
        
        renderBoard();
        feedbackEl.innerText = "All images placed! Click any image to swap it with the image to its right, then click Submit.";
    }
}

function placeCurrentItem(index) {
    boardState.splice(index, 0, currentItem);
    currentItem = null;
    nextPlacementTurn();
}

/**
 * Checks if a tile is locked/unmovable.
 * Only tiles explicitly evaluated and verified as correct (via Submit) are locked.
 */
function isTileLocked(index) {
    if (!boardState[index]) return false;
    const currentItem = boardState[index];
    return lockedIds.has(currentItem.id) || correctTileIds.has(currentItem.id);
}

// ==========================================
// CLICK-TO-SWAP RIGHT LOGIC (PHASE 2)
// ==========================================

function animateAndSwap(clickedIndex, targetIndex) {
    isSwapAnimating = true;
    const slots = boardEl.children;
    const clickedSlot = slots[clickedIndex];
    const targetSlot = slots[targetIndex];

    const clickedTile = clickedSlot?.querySelector('.tile');
    const targetTile = targetSlot?.querySelector('.tile');

    if (!clickedTile || !targetTile) {
        swapItems(clickedIndex, targetIndex);
        renderBoard();
        isSwapAnimating = false;
        return;
    }

    // Calculate dynamic distance offset
    const clickedRect = clickedTile.getBoundingClientRect();
    const targetRect = targetTile.getBoundingClientRect();

    const deltaXForClicked = targetRect.left - clickedRect.left;
    const deltaXForTarget = clickedRect.left - targetRect.left;

    clickedTile.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';
    targetTile.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)';
    clickedTile.style.zIndex = '10';
    targetTile.style.zIndex = '5';

    requestAnimationFrame(() => {
        clickedTile.style.transform = `translateX(${deltaXForClicked}px)`;
        targetTile.style.transform = `translateX(${deltaXForTarget}px)`;
    });

    setTimeout(() => {
        clickedTile.style.transform = '';
        clickedTile.style.transition = '';
        targetTile.style.transform = '';
        targetTile.style.transition = '';

        swapItems(clickedIndex, targetIndex);

        // Deduct points per move
        moveCount++;

        checkedCorrectness = false; 
        feedbackEl.innerText = "";
        renderBoard();
        isSwapAnimating = false;
    }, 250); 
}

function handleTileClickToSwap(clickedIndex) {
    if (phase !== "SORTING" || isSwapAnimating) return;
    if (isTileLocked(clickedIndex)) return; // Prevent swapping locked tiles

    const totalTiles = boardState.length;
    if (totalTiles <= 1) return;

    // Determine target index (wraps around to 0 if clicking the rightmost tile)
    let targetIndex = (clickedIndex + 1) % totalTiles;

    // Skip over locked tiles to find the next available unlocked tile to swap with
    let checkedCount = 0;
    while (isTileLocked(targetIndex) && checkedCount < totalTiles) {
        targetIndex = (targetIndex + 1) % totalTiles;
        checkedCount++;
    }

    // If all other tiles are locked, no swap can take place
    if (targetIndex === clickedIndex || isTileLocked(targetIndex)) return;

    animateAndSwap(clickedIndex, targetIndex);
}

function swapItems(fromIdx, toIdx) {
    const temp = boardState[fromIdx];
    boardState[fromIdx] = boardState[toIdx];
    boardState[toIdx] = temp;
}

/* --- Placement Stage Card Drag Handler --- */
currentImgEl.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', 'stage-card');
});

function setupTileDragAndDrop(targetEl, index) {
    if (phase === "PLACEMENT") {
        targetEl.addEventListener('dragover', (e) => e.preventDefault());
        targetEl.addEventListener('dragenter', () => targetEl.classList.add('drag-over'));
        targetEl.addEventListener('dragleave', () => targetEl.classList.remove('drag-over'));
        targetEl.addEventListener('drop', (e) => {
            e.preventDefault();
            targetEl.classList.remove('drag-over');
            placeCurrentItem(index);
        });
    } else if (phase === "SORTING") {
        if (isTileLocked(index)) return;

        targetEl.draggable = true;

        targetEl.addEventListener('dragstart', (e) => {
            if (isSwapAnimating) return;
            draggedIndex = index;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', index);
            setTimeout(() => targetEl.style.opacity = '0.5', 0);
        });

        targetEl.addEventListener('dragend', () => {
            targetEl.style.opacity = '1';
            draggedIndex = null;
        });

        targetEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
        });

        targetEl.addEventListener('dragenter', (e) => {
            e.preventDefault();
            if (draggedIndex !== index && !isTileLocked(index)) {
                targetEl.classList.add('drag-over');
            }
        });

        targetEl.addEventListener('dragleave', () => {
            targetEl.classList.remove('drag-over');
        });

        targetEl.addEventListener('drop', (e) => {
            e.preventDefault();
            targetEl.classList.remove('drag-over');
            
            if (draggedIndex !== null && draggedIndex !== index && !isTileLocked(index)) {
                swapItems(draggedIndex, index);


                checkedCorrectness = false;
                feedbackEl.innerText = "";
                renderBoard();
            }
        });
    }
}

function evaluateBoard() {
    checkedCorrectness = true;
    newlyLockedIds.clear(); 

    // Determine the TRUE correct order
    const correctOrder = [...boardState].sort((a, b) => a.val - b.val);
    let wrongCount = 0;
    let newlyFoundCorrect = 0;

    // Check each slot on the board
    boardState.forEach((item, i) => {
        if (item.id === correctOrder[i].id) {
            if (!correctTileIds.has(item.id)) {
                // Award +100 points per newly verified correct tile
                currentScore += 100;
                newlyFoundCorrect++;
            }

            correctTileIds.add(item.id);

            if (!lockedIds.has(item.id)) {
                newlyLockedIds.add(item.id);
            }
            lockedIds.add(item.id);
        } else {
            // Explicitly unlock misplaced items
            lockedIds.delete(item.id);
            correctTileIds.delete(item.id);
            wrongCount++;
        }
    });

    updateScoreUI();

    // Trigger toast for newly matched correct items
    if (newlyFoundCorrect > 0) {
        showToast(`+${newlyFoundCorrect * 100} Correct Match!`);
    }

    if (wrongCount === 0) {
        currentScore += 1000;
        updateScoreUI();

        showToast(`+1000 Puzzle Solved! 🎉`, true);

        feedbackEl.innerText = `🎉 Perfect! All images are correctly ordered! Final Score: ${currentScore}`;
        
        // REPLACE Submit with Play Again
        submitBtn.classList.add('hidden');
        if (restartBtn) restartBtn.classList.remove('hidden'); 
        
        phase = "COMPLETE";
        renderBoard();
        return;
    }

    if (wrongCount >= 4) {
        const autoFixCount = 2;
        feedbackEl.innerText = `Synaptic Assist activated! Helping out with ${autoFixCount} tile(s).`;
        autoCorrectTiles(correctOrder, autoFixCount);
    } else {
        feedbackEl.innerText = `Good progress! Correct items are locked in place.`;
        renderBoard();
    }
}

function initGame() {
    lockedIds.clear();
    newlyLockedIds.clear();
    correctTileIds.clear();
    pool = [...DATA_SET].sort(() => Math.random() - 0.5);
    boardState = [];
    phase = "PLACEMENT";
    checkedCorrectness = false;
    isSwapAnimating = false;
    
    currentScore = 0;
    updateScoreUI();

    feedbackEl.innerText = "";
    
    // Hide both buttons at start of Placement Phase
    submitBtn.classList.add('hidden');
    if (restartBtn) restartBtn.classList.add('hidden');
    
    stageArea.classList.remove('hidden');
    
    boardState.push(pool.pop());
    nextPlacementTurn();
}

// 3. Show "Submit" button when moving to the Sorting Phase
function nextPlacementTurn() {
    if (pool.length > 0) {
        currentItem = pool.pop();
        currentImgEl.src = currentItem.img;
        renderBoard();
    } else {
        phase = "SORTING";
        stageArea.classList.add('hidden');
        
        // Show Submit button
        submitBtn.classList.remove('hidden');
        if (restartBtn) restartBtn.classList.add('hidden');
        
        renderBoard();
        feedbackEl.innerText = "All images placed! Click any image to swap it with the image to its right, then click Submit.";
    }
}

function autoCorrectTiles(correctOrder, countToFix) {
    let fixed = 0;
    const slots = boardEl.children;

    let wrongIndices = boardState
        .map((item, idx) => (item.id !== correctOrder[idx].id ? idx : null))
        .filter(idx => idx !== null);

    wrongIndices.sort(() => Math.random() - 0.5);

    for (let i = 0; i < wrongIndices.length; i++) {
        const targetSlot = wrongIndices[i];
        const correctItem = correctOrder[targetSlot];
        
        const currentItemIndex = boardState.findIndex(item => item.id === correctItem.id);
        const displacedItem = boardState[targetSlot];

        const partnerWouldBeCorrect = (displacedItem.id === correctOrder[currentItemIndex].id);

        if (partnerWouldBeCorrect) {
            continue; 
        }

        if (slots[targetSlot]?.querySelector('.tile')) {
            slots[targetSlot].querySelector('.tile').classList.add('swapping');
        }
        if (slots[currentItemIndex]?.querySelector('.tile')) {
            slots[currentItemIndex].querySelector('.tile').classList.add('swapping');
        }

        swapItems(targetSlot, currentItemIndex);

        // Lock & permanently mark as correct
        lockedIds.add(correctItem.id);
        newlyLockedIds.add(correctItem.id);
        correctTileIds.add(correctItem.id);

        fixed++;
        if (fixed >= countToFix) break;
    }

    setTimeout(() => {
        renderBoard();
    }, 600);
}

function renderBoard() {
    boardEl.innerHTML = '';

    if (phase === "PLACEMENT") {
        for (let i = 0; i <= boardState.length; i++) {
            const dropSlot = document.createElement('div');
            dropSlot.className = 'slot';

            const dropZone = document.createElement('div');
            dropZone.className = 'drop-zone';
            dropZone.innerText = "Drop Here";

            dropZone.onclick = () => placeCurrentItem(i);

            setupTileDragAndDrop(dropZone, i);
            dropSlot.appendChild(dropZone);
            boardEl.appendChild(dropSlot);

            if (i < boardState.length) {
                const tileSlot = document.createElement('div');
                tileSlot.className = 'slot';
                tileSlot.innerHTML = `<div class="tile"><img src="${boardState[i].img}" /></div>`;
                boardEl.appendChild(tileSlot);
            }
        }
    }
    else { // SORTING or COMPLETE Phase
        boardState.forEach((item, index) => {
            const slot = document.createElement('div');
            slot.className = 'slot';

            const isLocked = isTileLocked(index);
            let tileClasses = `tile`;

            if (phase === 'SORTING' && !isLocked) {
                tileClasses += ' selectable';
            }

            if (isLocked) {
                tileClasses += ' locked';
            }

            if (newlyLockedIds.has(item.id)) {
                tileClasses += ' just-locked';
            }

            if (correctTileIds.has(item.id)) {
                tileClasses += ' correct';
            } else if (checkedCorrectness) {
                tileClasses += ' incorrect';
            }

            const tile = document.createElement('div');
            tile.className = tileClasses;
            tile.innerHTML = `<img src="${item.img}" />`;
            
            if (!isLocked && phase === 'SORTING') {
                tile.onclick = () => handleTileClickToSwap(index);
                setupTileDragAndDrop(tile, index);
            }

            slot.appendChild(tile);
            boardEl.appendChild(slot);
        });

        newlyLockedIds.clear();
    }
}

// Event Listeners & Game Init
submitBtn.onclick = () => evaluateBoard();

// Smooth Wheel Horizontal Scroll Handler
let targetScrollLeft = 0;
let isAnimating = false;

boardEl.addEventListener('wheel', (e) => {
    if (e.deltaY !== 0) {
        e.preventDefault();

        if (!isAnimating) {
            targetScrollLeft = boardEl.scrollLeft;
        }

        targetScrollLeft += e.deltaY * 1.5;

        const maxScroll = boardEl.scrollWidth - boardEl.clientWidth;
        targetScrollLeft = Math.max(0, Math.min(targetScrollLeft, maxScroll));

        if (!isAnimating) {
            isAnimating = true;
            requestAnimationFrame(smoothScrollLoop);
        }
    }
}, { passive: false });

submitBtn.onclick = () => evaluateBoard();
if (restartBtn) {
    restartBtn.onclick = () => initGame();
};

function smoothScrollLoop() {
    const diff = targetScrollLeft - boardEl.scrollLeft;

    if (Math.abs(diff) > 0.5) {
        boardEl.scrollLeft += diff * 0.15;
        requestAnimationFrame(smoothScrollLoop);
    } else {
        boardEl.scrollLeft = targetScrollLeft;
        isAnimating = false;
    }
}

initGame();