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
        // Exit early if tile is locked
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
    const correctOrder = [...boardState].sort((a, b) => a.val - b.val);
    let wrongCount = 0;

    boardState.forEach((item, i) => {
        if (item.id === correctOrder[i].id) {
            lockedIds.add(item.id); // Permanently lock
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
    } else {
        feedbackEl.innerText = `Incorrect items remaining: ${wrongCount}. Correct items are now locked!`;
        selectNextUnlockedTile(selectedIndex ?? 0);
    }

    renderBoard();
}

function autoCorrectTiles(correctOrder, countToFix) {
    let fixed = 0;
    for (let i = 0; i < boardState.length; i++) {
        if (boardState[i].id !== correctOrder[i].id) {
            const targetId = correctOrder[i].id;
            const currentIndex = boardState.findIndex(item => item.id === targetId);

            swapItems(i, currentIndex);

            fixed++;
            if (fixed >= countToFix) break;
        }
    }

    setTimeout(() => {
        if (selectedIndex !== null && isTileLocked(selectedIndex)) {
            selectNextUnlockedTile(selectedIndex);
        }
        renderBoard();
    }, 1200);
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

            // Always keep locked visual style active if locked
            if (isLocked) {
                tileClasses += ' locked';
            }

            // Only apply green/red feedback right after hitting Submit
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
            
            // Correctly check if unlocked tiles exist to the left or right
            const hasUnlockedLeft = boardState.slice(0, selectedIndex).some(item => !lockedIds.has(item.id));
            const hasUnlockedRight = boardState.slice(selectedIndex + 1).some(item => !lockedIds.has(item.id));

            moveLeftBtn.disabled = !hasUnlockedLeft;
            moveRightBtn.disabled = !hasUnlockedRight;
        } else {
            selectedInfo.innerText = "Select an unlocked image";
            moveLeftBtn.disabled = true;
            moveRightBtn.disabled = true;
        }
    }
}

    if (selectedIndex !== null && !isTileLocked(selectedIndex)) {
        selectedInfo.innerText = `Selected Image: #${selectedIndex + 1}`;
        
        // Check if an unlocked tile exists anywhere to the left
        const hasUnlockedLeft = boardState.slice(0, selectedIndex).some((_, i) => !isTileLocked(i));
        // Check if an unlocked tile exists anywhere to the right
        const hasUnlockedRight = boardState.slice(selectedIndex + 1).some((item, i) => !lockedIds.has(item.id));

        moveLeftBtn.disabled = !hasUnlockedLeft;
        moveRightBtn.disabled = !hasUnlockedRight;
    } else {
        selectedInfo.innerText = "Select an unlocked image";
        moveLeftBtn.disabled = true;
        moveRightBtn.disabled = true;
    }

moveLeftBtn.onclick = () => shiftSelected(-1);
moveRightBtn.onclick = () => shiftSelected(1);
submitBtn.onclick = () => evaluateBoard();

initGame();