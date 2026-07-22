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

// Game State variables
let pool = [];
let newlyLockedIds = new Set();
let boardState = [];
let currentItem = null;
let phase = "PLACEMENT"; // PLACEMENT, SORTING, COMPLETE
let selectedIndex = null;
let lockedIds = new Set();
let draggedIndex = null; 
let checkedCorrectness = false; // Controls whether red/green feedback is visible

// DOM Elements
const stageArea = document.getElementById('stage-area');
const currentImgEl = document.getElementById('current-img');
const boardEl = document.getElementById('board');
const submitBtn = document.getElementById('submit-btn');
const feedbackEl = document.getElementById('feedback');
const controlCenter = document.getElementById('control-center');
const moveLeftBtn = document.getElementById('move-left-btn');
const moveRightBtn = document.getElementById('move-right-btn');
const selectedInfo = document.getElementById('selected-info');

function initGame() {
    lockedIds.clear();
    newlyLockedIds.clear();
    pool = [...DATA_SET].sort(() => Math.random() - 0.5);
    boardState = [];
    phase = "PLACEMENT";
    selectedIndex = null;
    checkedCorrectness = false;
    
    feedbackEl.innerText = "";
    submitBtn.classList.add('hidden');
    controlCenter.classList.add('hidden');
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
        controlCenter.classList.remove('hidden');
        
        // Find first unlocked tile to select by default
        selectNextUnlockedTile(0);
        renderBoard();
        feedbackEl.innerText = "All images placed! Shift or drag items to refine your order, then click Submit.";
    }
}

function placeCurrentItem(index) {
    boardState.splice(index, 0, currentItem);
    currentItem = null;
    nextPlacementTurn();
}

function isTileLocked(index) {
    if (!boardState[index]) return false;
    return lockedIds.has(boardState[index].id);
}

function selectTile(index) {
    if (phase !== "SORTING") return;
    if (isTileLocked(index)) return; // Prevent selecting locked tiles
    selectedIndex = index;
    renderBoard();
}

function selectNextUnlockedTile(preferredIndex) {
    for (let i = preferredIndex; i < boardState.length; i++) {
        if (!isTileLocked(i)) {
            selectedIndex = i;
            return;
        }
    }
    for (let i = preferredIndex - 1; i >= 0; i--) {
        if (!isTileLocked(i)) {
            selectedIndex = i;
            return;
        }
    }
    selectedIndex = null;
}

function shiftSelected(direction) {
    if (selectedIndex === null || phase !== "SORTING") return;
    if (isTileLocked(selectedIndex)) return;

    // Scan in the given direction (-1 or +1) to find the nearest unlocked tile
    let targetIndex = selectedIndex + direction;
    while (targetIndex >= 0 && targetIndex < boardState.length) {
        if (!isTileLocked(targetIndex)) {
            break; // Found the next unlocked tile to swap with
        }
        targetIndex += direction;
    }

    // If out of bounds or no unlocked tile found in that direction, do nothing
    if (targetIndex < 0 || targetIndex >= boardState.length) return;

    // Swap selected item with the target unlocked item
    swapItems(selectedIndex, targetIndex);
    selectedIndex = targetIndex;
    
    // Clear check highlight on move until next Submit
    checkedCorrectness = false; 
    feedbackEl.innerText = "";

    renderBoard();
}

function swapItems(fromIdx, toIdx) {
    const temp = boardState[fromIdx];
    boardState[fromIdx] = boardState[toIdx];
    boardState[toIdx] = temp;
}

// Keyboard Controls (Only active during sorting phase)
document.addEventListener('keydown', (e) => {
    if (phase !== "SORTING" || selectedIndex === null) return;

    if (e.key === "ArrowLeft") {
        shiftSelected(-1);
    } else if (e.key === "ArrowRight") {
        shiftSelected(1);
    }
});

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
            draggedIndex = index;
            selectedIndex = index;
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
                selectedIndex = index;
                
                // Reset verification state on user move
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
    const correctOrder = [...boardState].sort((a, b) => a.val - b.val);
    let wrongCount = 0;

    // Identify correct items
    boardState.forEach((item, i) => {
        if (item.id === correctOrder[i].id) {
            // Only lock if it wasn't locked already
            if (!lockedIds.has(item.id)) {
                newlyLockedIds.add(item.id);
            }
            lockedIds.add(item.id);
        } else {
            wrongCount++;
        }
    });

    if (wrongCount === 0) {
        feedbackEl.innerText = "🎉 Perfect! All images are correctly ordered!";
        submitBtn.classList.add('hidden');
        controlCenter.classList.add('hidden');
        phase = "COMPLETE";
        selectedIndex = null;
        renderBoard();
        return;
    }

    if (wrongCount >= 7) {
        const autoFixCount = 2;
        feedbackEl.innerText = `⚡ Synaptic Assist activated! Misplaced items: ${wrongCount}. Auto-correcting ${autoFixCount} tile(s).`;
        autoCorrectTiles(correctOrder, autoFixCount);
    } else {
        feedbackEl.innerText = `Incorrect items remaining: ${wrongCount}. Correct items are now locked!`;
        selectNextUnlockedTile(selectedIndex ?? 0);
        renderBoard();
    }
}

function autoCorrectTiles(correctOrder, countToFix) {
    let fixed = 0;
    const slots = boardEl.children;

    // Get indices of all currently incorrect tiles
    let wrongIndices = boardState
        .map((item, idx) => (item.id !== correctOrder[idx].id ? idx : null))
        .filter(idx => idx !== null);

    // Shuffle wrongIndices randomly to pick random candidates
    wrongIndices.sort(() => Math.random() - 0.5);

    for (let i = 0; i < wrongIndices.length; i++) {
        const targetSlot = wrongIndices[i];
        const correctItem = correctOrder[targetSlot];
        
        // Find where the correct item currently sits
        const currentItemIndex = boardState.findIndex(item => item.id === correctItem.id);
        const displacedItem = boardState[targetSlot];

        // CHECK MECHANISM:
        // 1. Target tile WILL become correct.
        // 2. Partner tile (displacedItem) MUST NOT become correct.
        const partnerWouldBeCorrect = (displacedItem.id === correctOrder[currentItemIndex].id);

        // If swapping here would make BOTH correct, skip and try the next random candidate
        if (partnerWouldBeCorrect) {
            continue; 
        }

        // Add visual animation feedback
        if (slots[targetSlot]?.querySelector('.tile')) {
            slots[targetSlot].querySelector('.tile').classList.add('swapping');
        }
        if (slots[currentItemIndex]?.querySelector('.tile')) {
            slots[currentItemIndex].querySelector('.tile').classList.add('swapping');
        }

        // Perform the swap
        swapItems(targetSlot, currentItemIndex);

        // Lock strictly the intentionally corrected item
        lockedIds.add(correctItem.id);
        newlyLockedIds.add(correctItem.id);

        fixed++;
        if (fixed >= countToFix) break;
    }

    // Re-render after animation delay
    setTimeout(() => {
        if (selectedIndex !== null && isTileLocked(selectedIndex)) {
            selectNextUnlockedTile(selectedIndex);
        }
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
        
        // Remove 'boardEl.scrollLeft = boardEl.scrollWidth;' so the board 
        // doesn't lock your view to the far right on every placement!
    }
    else { // SORTING or COMPLETE Phase
        const correctOrder = [...boardState].sort((a, b) => a.val - b.val);

        boardState.forEach((item, index) => {
            const slot = document.createElement('div');
            slot.className = 'slot';

            const isLocked = isTileLocked(index);
            let tileClasses = `tile`;

            if (phase === 'SORTING' && !isLocked) {
                tileClasses += ' selectable';
            }

            if (index === selectedIndex && !isLocked) {
                tileClasses += ' selected';
            }

            if (isLocked) {
                tileClasses += ' locked';
            }

            if (newlyLockedIds.has(item.id)) {
                tileClasses += ' just-locked';
            }

            if (checkedCorrectness) {
                if (item.id === correctOrder[index].id) {
                    tileClasses += ' correct';
                } else {
                    tileClasses += ' incorrect';
                }
            }

            const tile = document.createElement('div');
            tile.className = tileClasses;
            tile.innerHTML = `<img src="${item.img}" />`;
            
            if (!isLocked && phase === 'SORTING') {
                tile.onclick = () => selectTile(index);
                setupTileDragAndDrop(tile, index);
            }

            slot.appendChild(tile);
            boardEl.appendChild(slot);
        });

        if (selectedIndex !== null && !isTileLocked(selectedIndex)) {
            selectedInfo.innerText = `Selected Image: #${selectedIndex + 1}`;
            
            const hasUnlockedLeft = boardState.slice(0, selectedIndex).some(item => !lockedIds.has(item.id));
            const hasUnlockedRight = boardState.slice(selectedIndex + 1).some(item => !lockedIds.has(item.id));

            moveLeftBtn.disabled = !hasUnlockedLeft;
            moveRightBtn.disabled = !hasUnlockedRight;
        } else {
            selectedInfo.innerText = "Select an unlocked image";
            moveLeftBtn.disabled = true;
            moveRightBtn.disabled = true;
        }

        newlyLockedIds.clear();
    }
}

// Event Listeners & Game Init
moveLeftBtn.onclick = () => shiftSelected(-1);
moveRightBtn.onclick = () => shiftSelected(1);
submitBtn.onclick = () => evaluateBoard();

// Convert vertical mouse scroll wheel movement into faster horizontal scrolling
// Smooth wheel scrolling handler
let targetScrollLeft = 0;
let isAnimating = false;

boardEl.addEventListener('wheel', (e) => {
    if (e.deltaY !== 0) {
        e.preventDefault(); // Stop vertical page scrolling

        // If animation loop isn't running, start from current actual position
        if (!isAnimating) {
            targetScrollLeft = boardEl.scrollLeft;
        }

        // Accumulate target distance (adjust 1.5 multiplier to tweak speed)
        targetScrollLeft += e.deltaY * 1.5;

        // Clamp target within board scroll limits
        const maxScroll = boardEl.scrollWidth - boardEl.clientWidth;
        targetScrollLeft = Math.max(0, Math.min(targetScrollLeft, maxScroll));

        // Start animation loop if not active
        if (!isAnimating) {
            isAnimating = true;
            requestAnimationFrame(smoothScrollLoop);
        }
    }
}, { passive: false });

function smoothScrollLoop() {
    // Calculate distance remaining to target position
    const diff = targetScrollLeft - boardEl.scrollLeft;

    // Smoothly ease towards the target (0.15 controls smooth friction/decay)
    if (Math.abs(diff) > 0.5) {
        boardEl.scrollLeft += diff * 0.15;
        requestAnimationFrame(smoothScrollLoop);
    } else {
        boardEl.scrollLeft = targetScrollLeft;
        isAnimating = false;
    }
}

initGame();