// Sample Data: 8 items with true relative activation values (0 to 100)
const DATA_SET = [
    { id: 1, val: 12, img: "https://picsum.photos/seed/neuron1/100/100" },
    { id: 2, val: 25, img: "https://picsum.photos/seed/neuron2/100/100" },
    { id: 3, val: 38, img: "https://picsum.photos/seed/neuron3/100/100" },
    { id: 4, val: 45, img: "https://picsum.photos/seed/neuron4/100/100" },
    { id: 5, val: 60, img: "https://picsum.photos/seed/neuron5/100/100" },
    { id: 6, val: 72, img: "https://picsum.photos/seed/neuron6/100/100" },
    { id: 7, val: 88, img: "https://picsum.photos/seed/neuron7/100/100" },
    { id: 8, val: 95, img: "https://picsum.photos/seed/neuron8/100/100" },
    { id: 9, val: 46, img: "https://picsum.photos/seed/neuron9/100/100" }
];

let newlyPlacedIndex = null;
let newlyAddedDropIndices = []; // Stores both new drop box indices
let lockedIds = new Set();
let newlyLockedIds = new Set();
let correctTileIds = new Set(); 
let pool = [];
let boardState = [];
let currentItem = null;
let phase = "PLACEMENT"; // PLACEMENT, SORTING, COMPLETE
let draggedIndex = null; 
let checkedCorrectness = false; 
let isSwapAnimating = false; 
let justPlacedIndex = null; // Track index of newly placed item

// Score & Streak Tracking
let currentScore = 0;
let currentStreak = 0;

// DOM Elements
const restartBtn = document.getElementById('restart-btn');
const stageArea = document.getElementById('stage-area');
const currentImgEl = document.getElementById('current-img');
const boardEl = document.getElementById('board');
const submitBtn = document.getElementById('submit-btn');
const feedbackEl = document.getElementById('feedback');
const scoreDisplayEl = document.getElementById('score-display');
const sortingPhase = document.querySelector('.sorting-phase');

// ==========================================
// UI & TOAST NOTIFICATIONS
// ==========================================

function updateScoreUI() {
    if (scoreDisplayEl) scoreDisplayEl.innerText = `Score: ${Math.max(0, currentScore)}`;
}

function showToast(message, isSpecial = false) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    
    let toastClass = 'score-toast';
    if (message.includes('Streak')) {
        toastClass += ' streak';
    } else if (isSpecial) {
        toastClass += ' gold';
    }

    toast.className = toastClass;
    toast.innerText = message;

    container.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 1600);
}

// ==========================================
// GAME INITIALIZATION & FLOW
// ==========================================

function initGame() {
    lockedIds.clear();
    newlyLockedIds.clear();
    newlyPlacedIndex = null;
    newlyAddedDropIndices = [];
    correctTileIds.clear();
    justPlacedIndex = null;
    pool = [...DATA_SET].sort(() => Math.random() - 0.5);
    boardState = [];
    phase = "PLACEMENT";
    checkedCorrectness = false;
    isSwapAnimating = false;
    
    currentScore = 0;
    currentStreak = 0;
    updateScoreUI();

    feedbackEl.innerText = "";
    
    submitBtn.classList.add('hidden');
    if (restartBtn) restartBtn.classList.add('hidden');
    
    sortingPhase.classList.remove('sort-float-up')
    currentImgEl.style.opacity = '1';
    stageArea.classList.remove('hidden-stage');
    boardState.push(pool.pop());
    nextPlacementTurn();
}

function nextPlacementTurn() {
    if (pool.length > 0) {
        currentItem = pool.pop();
        currentImgEl.src = currentItem.img;
        renderBoard();
    }
    }

function placeCurrentItem(index) {
    boardState.splice(index, 0, currentItem);
    currentItem = null;

    // The tile is placed at `index`
    newlyPlacedIndex = index;
    
    // Both drop zones on either side of the new tile are newly spawned!
    newlyAddedDropIndices = [index, index + 1];

    if (pool.length > 0) {
        nextPlacementTurn();
    } else {
        currentImgEl.src = ""; 
        renderBoard();
        currentImgEl.src = 'https://picsum.photos/id/237/200/300';
        currentImgEl.style.opacity = '0';
        stageArea.classList.add('hidden-stage');
        sortingPhase.classList.add('sort-float-up');
        phase = 'SORTING';
        collapseBoardAndCheck();
    }
}

function collapseBoardAndCheck() {
    // Force a browser paint cycle so the transition starts smoothly from full width
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            const dropSlots = boardEl.querySelectorAll('.drop-slot');
            dropSlots.forEach(slot => slot.classList.add('collapsed'));

            const dropZones = boardEl.querySelectorAll('.drop-zone');
            dropZones.forEach(zone => zone.classList.add('collapsed'));
        });
    });

    // Wait 550ms for the horizontal shrink & slide animation to finish completely
    setTimeout(() => {
        phase = "SORTING";
        evaluateBoard(); // Checks correctness and displays red/green borders
    }, 1000); 
}

function isTileLocked(index) {
    if (!boardState[index]) return false;
    const item = boardState[index];
    return lockedIds.has(item.id) || correctTileIds.has(item.id);
}

// ==========================================
// CLICK-TO-SWAP & DRAG LOGIC (PHASE 2)
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

        checkedCorrectness = false; 
        feedbackEl.innerText = "";
        renderBoard();
        isSwapAnimating = false;
    }, 250); 
}

function handleTileClickToSwap(clickedIndex) {
    if (phase !== "SORTING" || isSwapAnimating) return;
    if (isTileLocked(clickedIndex)) return;

    const totalTiles = boardState.length;
    if (totalTiles <= 1) return;

    let targetIndex = (clickedIndex + 1) % totalTiles;

    let checkedCount = 0;
    while (isTileLocked(targetIndex) && checkedCount < totalTiles) {
        targetIndex = (targetIndex + 1) % totalTiles;
        checkedCount++;
    }

    if (targetIndex === clickedIndex || isTileLocked(targetIndex)) return;

    animateAndSwap(clickedIndex, targetIndex);
}

function swapItems(fromIdx, toIdx) {
    const temp = boardState[fromIdx];
    boardState[fromIdx] = boardState[toIdx];
    boardState[toIdx] = temp;
}

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

// ==========================================
// EVALUATION
// ==========================================

function evaluateBoard() {
    checkedCorrectness = true;
    newlyLockedIds.clear(); 

    const correctOrder = [...boardState].sort((a, b) => a.val - b.val);
    let wrongCount = 0;
    let newlyFoundCorrect = 0;

    boardState.forEach((item, i) => {
        if (item.id === correctOrder[i].id) {
            if (!correctTileIds.has(item.id)) {
                currentScore += 100;
                newlyFoundCorrect++;
                currentStreak++;

                if (currentStreak % 2 === 0) {
                    currentScore += 150;
                    showToast(`🔥 ${currentStreak} Streak! +150 Bonus!`, true);
                }
            }

            correctTileIds.add(item.id);

            if (!lockedIds.has(item.id)) {
                newlyLockedIds.add(item.id);
            }
            lockedIds.add(item.id);
        } else {
            lockedIds.delete(item.id);
            correctTileIds.delete(item.id);
            wrongCount++;
        }
    });

    if (wrongCount > 0) {
        currentStreak = 0;
    }

    updateScoreUI();

    if (newlyFoundCorrect > 0) {
        showToast(`+${newlyFoundCorrect * 100} Correct Match!`);
    }

    // WIN STATE
    if (wrongCount === 0) {
        currentScore += 1000;
        updateScoreUI();

        showToast(`+1000 Puzzle Solved! 🎉`, true);
        feedbackEl.innerText = `🎉 Perfect! All images are correctly ordered! Final Score: ${currentScore}`;
        
        submitBtn.classList.add('hidden');
        if (restartBtn) restartBtn.classList.remove('hidden');
        
        phase = "COMPLETE";
        renderBoard();
        return;
    }

    // Render board with Phase 2 layout and red/green borders
    renderBoard();

    // Enable submit button for subsequent attempts
    submitBtn.classList.remove('hidden');

    if (wrongCount > 6) {
        const autoFixCount = 2;
        feedbackEl.innerText = `⚡ Synaptic Assist activated! Helping out with ${autoFixCount} tile(s).`;
        autoCorrectTiles(correctOrder, autoFixCount);
    } else {
        feedbackEl.innerText = `Good progress! Click or drag unlocked tiles to swap them.`;
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

        const tileA = slots[targetSlot]?.querySelector('.tile');
        const tileB = slots[currentItemIndex]?.querySelector('.tile');

        if (tileA) tileA.classList.add('swapping');
        if (tileB) tileB.classList.add('swapping');

        swapItems(targetSlot, currentItemIndex);

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

// ==========================================
// BOARD RENDERING
// ==========================================

function renderBoard() {
    boardEl.innerHTML = '';

    if (phase === "PLACEMENT") {
        for (let i = 0; i <= boardState.length; i++) {
            // Render Drop Zone
            if (!checkedCorrectness) {
                const dropSlot = document.createElement('div');
                
                // Check if this drop slot is one of the two newly created ones
                const isNewDrop = newlyAddedDropIndices.includes(i);
                dropSlot.className = `slot drop-slot${isNewDrop ? ' expanding' : ''}`;

                const dropZone = document.createElement('div');
                dropZone.className = `drop-zone${isNewDrop ? ' expanding' : ''}`;
                dropZone.innerText = "Drop Here";

                dropZone.onclick = () => placeCurrentItem(i);

                setupTileDragAndDrop(dropZone, i);
                dropSlot.appendChild(dropZone);
                boardEl.appendChild(dropSlot);
            }

            // Render Placed Tile
            if (i < boardState.length) {
                const item = boardState[i];
                const tileSlot = document.createElement('div');
                tileSlot.className = 'slot';

                let tileClasses = `tile`;

                // Only bounce the newly placed tile
                if (i === newlyPlacedIndex) {
                    tileClasses += ' just-placed';
                }

                if (correctTileIds.has(item.id)) {
                    tileClasses += ' correct locked';
                } else if (checkedCorrectness) {
                    tileClasses += ' incorrect';
                }

                tileSlot.innerHTML = `<div class="${tileClasses}"><img src="${item.img}" /></div>`;
                boardEl.appendChild(tileSlot);
            }
        }

        // Clear tracking after rendering
        newlyPlacedIndex = null;
        newlyAddedDropIndices = [];
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
// ==========================================
// SCROLLING & EVENT LISTENERS
// ==========================================

submitBtn.onclick = () => evaluateBoard();

if (restartBtn) {
    restartBtn.onclick = () => initGame();
}

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

// Initialize on page load
initGame();