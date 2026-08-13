// ==========================================
// 1. GAME DATA & TELEMETRY STATE
// ==========================================
let selected = [];
let dailyCorrectMatches = [[8,2,3,4], [1,5,9,13], [6,10,14,15], [7,11,12,16]];
let lives = 0;
let isDragging = false;
const matchedGroups = {
    0: 'Group 1',
    1: 'Group 2',
    2: 'Group 3',
    3: 'Group 4'
};

// A potential idea could be to include anti-pref / pref stimulus as hints for categories (Rabia et al., 2026)

let toastTimer = null;

let attempts = 0;
let correctAttempts = 0;
let accuracy = 0;
let incorrectAttempts = 0;

const order = [];
let timesShuffled = 0;
let deselectionRate = 0;
let deselectionEvents = 0;
let incorrectSelections = [];
let correctAdjustments = 0;
let forfeitStatus = 'N';
let nudged = false;
let lastHoveredTileId = null;

// Telemetry and remote submission removed for local-only usage

function isOrthogonallyAdjacent(elA, elB) {
    const idxA = parseInt(elA.dataset.index);
    const idxB = parseInt(elB.dataset.index);

    const r1 = Math.floor(idxA / 4);
    const c1 = idxA % 4;
    const r2 = Math.floor(idxB / 4);
    const c2 = idxB % 4;

    const rowDiff = Math.abs(r1 - r2);
    const colDiff = Math.abs(c1 - c2);

    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
}

function tryAddOrBacktrackTile(el) {
    if (!el || el.classList.contains("correct-group") || el.classList.contains("solved")) return;

    const idNum = Number(el.id);

    // =========================================================
    // RULE OF THUMB: DESELECTION LOGIC
    // Tapping ANY already-selected tile deselects it and all 
    // subsequent tiles selected after it in the chain.
    // =========================================================
    if (selected.includes(idNum)) {
        const idx = selected.indexOf(idNum);
        
        // Remove the target tile AND everything that came after it
        const removed = selected.slice(idx);
        selected = selected.slice(0, idx);

        removed.forEach(rId => {
            const rEl = document.getElementById(String(rId));
            if (rEl) rEl.classList.remove("selected");
        });

        deselectionEvents += removed.length;
        renderPath();
        return;
    }

    // =========================================================
    // SELECTION LOGIC
    // =========================================================

    // 1. Start fresh strand (no tiles currently selected)
    if (selected.length === 0) {
        selected.push(idNum);
        el.classList.add("selected");
        renderPath();
        return;
    }

    // 2. Add adjacent tile (Max 4 tiles)
    if (selected.length < 4) {
        const lastId = selected[selected.length - 1];
        const lastEl = document.getElementById(String(lastId));

        if (lastEl && isOrthogonallyAdjacent(lastEl, el)) {
            selected.push(idNum);
            el.classList.add("selected");
            renderPath();
            return;
        }
    }

    // 3. Tapping an unselected non-adjacent tile when a path exists 
    // -> clears the old chain and starts a new chain at the tapped tile
    clearSelectionPath();
    selected.push(idNum);
    el.classList.add("selected");
    renderPath();
}

function renderPath() {
    drawPathLines();
}

function drawPathLines() {
    const svgEl = document.getElementById('path-overlay');
    if (!svgEl) return;

    svgEl.innerHTML = '';
    if (selected.length < 2) return;

    const containerRect = document.getElementById('grid-container').getBoundingClientRect();

    for (let i = 0; i < selected.length - 1; i++) {
        const elA = document.getElementById(String(selected[i]));
        const elB = document.getElementById(String(selected[i + 1]));

        if (!elA || !elB) continue;

        const rectA = elA.getBoundingClientRect();
        const rectB = elB.getBoundingClientRect();

        const x1 = rectA.left + rectA.width / 2 - containerRect.left;
        const y1 = rectA.top + rectA.height / 2 - containerRect.top;
        const x2 = rectB.left + rectB.width / 2 - containerRect.left;
        const y2 = rectB.top + rectB.height / 2 - containerRect.top;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x1);
        line.setAttribute('y1', y1);
        line.setAttribute('x2', x2);
        line.setAttribute('y2', y2);
        line.setAttribute('class', 'path-line');

        svgEl.appendChild(line);
    }
}

function clearSelectionPath() {
    selected.forEach(idNum => {
        const el = document.getElementById(String(idNum));
        if (el) el.classList.remove("selected");
    });
    selected = [];
    renderPath();
}


function showToast(text, duration = 1500) {
    const toastEl = document.getElementById('toast-msg');
    if (!toastEl) return;

    if (toastTimer) clearTimeout(toastTimer);

    toastEl.innerText = text;
    toastEl.classList.remove('hidden');

    toastTimer = setTimeout(() => {
        toastEl.classList.add('hidden');
    }, duration);
}

function isAlreadyGuessed(currentSelection, pastSelections) {
    const sortedCurrent = lowToHigh(currentSelection);
    return pastSelections.some(past => {
        const sortedPast = lowToHigh(past);
        return JSON.stringify(sortedCurrent) === JSON.stringify(sortedPast);
    });
}


// Removed remote telemetry and data submission utilities to keep this local-only.

function lowToHigh(arr) {
    return [...arr].sort((a, b) => a - b);
}

function countCommonItems(arr1, arr2) {
    const set2 = new Set(arr2);
    return arr1.filter((value) => set2.has(value)).length;
}

function triggerShakeAnimation() {
    const selectedEls = selected
        .map(id => document.getElementById(String(id)))
        .filter(Boolean);

    selectedEls.forEach(el => el.classList.add('shake'));

    setTimeout(() => {
        selectedEls.forEach(el => el.classList.remove('shake'));
    }, 400);
}

// ==========================================
// 3. BOARD & SELECTION MANAGEMENT
// ==========================================

// Assign dataset.index on boot so adjacency works before any shuffle occurs
function initializeTileIndices() {
    const container = document.querySelector('.images');
    if (!container) return;
    const tiles = Array.from(container.children).filter(el => !el.classList.contains('correct-group'));
    tiles.forEach((el, index) => {
        el.dataset.index = index;
    });
}

function setBoardEnabled(enabled) {
    const grid = document.getElementById('strands-grid');
    if (grid) {
        grid.style.pointerEvents = enabled ? 'auto' : 'none';
    }
}

// Category banner feature removed: blocks remain static when category solved.

// Call on startup
initializeTileIndices();

// ==========================================
// 4. SUBMIT, SHUFFLE & FORFEIT CONTROLS
// ==========================================
const submitBtn = document.getElementById("submitbtn");

if (submitBtn) {
    submitBtn.addEventListener("click", function() {
        if (selected.length !== 4) {
            showToast("Please select 4 images.");
            return;
        }

        if (isAlreadyGuessed(selected, incorrectSelections)) {
            triggerShakeAnimation();
            showToast("Already guessed!");
            return;
        }

        submitBtn.disabled = true;

        setTimeout(() => {
            submitBtn.disabled = false;

            
            const sortedSelected = lowToHigh(selected);
            let matchedCategory = null;
            let oneAway = false;

            for (const match of dailyCorrectMatches) {
                const sortedSelectedMatch = lowToHigh(match);
                if (JSON.stringify(sortedSelected) === JSON.stringify(sortedSelectedMatch)) {
                    matchedCategory = matchedGroups[dailyCorrectMatches.indexOf(match)];
                    break;
                }
                if (countCommonItems(sortedSelected, sortedSelectedMatch) === 3) {
                    oneAway = true;
                }
            }

            if (matchedCategory) {
                showToast(`Category Discovered: ${matchedCategory}`, 2000);
                if (nudged) {
                    correctAdjustments++;
                    nudged = false;
                }
                
                order.push(matchedCategory);
                attempts++;
                    // Mark solved tiles: animate them away and make them unselectable
                    selected.forEach(idNum => {
                        const tileEl = document.getElementById(String(idNum));
                        if (tileEl) {
                            tileEl.classList.add('solved');
                            // Keep legacy marker so other logic treats them as solved
                            tileEl.classList.add('correct-group');
                            tileEl.style.pointerEvents = 'none';
                            tileEl.setAttribute('aria-hidden', 'true');
                        }
                    });
                correctAttempts++;
                accuracy = correctAttempts / attempts;
                deselectionRate = deselectionEvents / attempts;
                
                clearSelectionPath();
                setBoardEnabled(true);

                if (correctAttempts === 4) {
                    setBoardEnabled(false);
                    if (forfeitBtn) forfeitBtn.disabled = true;
                    setTimeout(() => showToast('You win! Thank you for playing!', 3000), 500);
                }
            } else {
                triggerShakeAnimation();

                if (oneAway) {
                    showToast("One away!");
                    nudged = true;
                } else {
                    showToast("Incorrect match.");
                }
                
                incorrectSelections.push([...selected]);
                attempts++;
                incorrectAttempts++;
                accuracy = correctAttempts / attempts;
                deselectionRate = deselectionEvents / attempts;
                lives++;

                for (let i = 0; i < lives; i++) {
                    const lifeEl = document.getElementById(`life${4 - i}`);
                    if (lifeEl) lifeEl.style.opacity = '0.15';
                }

                if (incorrectAttempts === 4) {
                    setBoardEnabled(false);
                    if (forfeitBtn) forfeitBtn.disabled = true;
                    setTimeout(() => showToast('Good try. Thank you for playing!', 3000), 500);
                }
            }
        }, 1000);
    });
}

function shuffleInDOM() {
    const container = document.querySelector('.images');
    if (!container) return;

    const currentDomElements = Array.from(container.children);
    
    // Banners have class 'correct-group' and stay fixed at top
    const fixedEls = currentDomElements.filter(el => el.classList.contains('correct-group'));
    const shuffleEls = currentDomElements.filter(el => !el.classList.contains('correct-group'));

    if (shuffleEls.length <= 1) return;

    // Shuffle remaining active tiles
    let isSameOrder = true;
    const initialOrder = shuffleEls.map(el => el.id).join(',');
    

    while (isSameOrder && shuffleEls.length > 1) {
        for (let i = shuffleEls.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffleEls[i], shuffleEls[j]] = [shuffleEls[j], shuffleEls[i]];
        }
        const newOrder = shuffleEls.map(el => el.id).join(',');
        if (newOrder !== initialOrder) {
            isSameOrder = false;
        }
    }
    
    const solvedRowsOffset = fixedEls.length * 4;
    shuffleEls.forEach((el, index) => {
        el.dataset.index = solvedRowsOffset + index;
    });

    // Re-append elements (banners first, then shuffled images)
    for (const el of [...fixedEls, ...shuffleEls]) {
        container.appendChild(el);
    }
    clearSelectionPath();
}

const gridEl = document.getElementById('strands-grid');

if (gridEl) {
    // 1. Pointer Down: Capture pointer to track seamlessly even outside boundaries
    gridEl.addEventListener('pointerdown', (e) => {
        const tile = e.target.closest('img');
        if (!tile || e.button !== 0) return; // Only primary mouse click or touch

        isDragging = true;
        lastHoveredTileId = tile.id;
        
        // Capture pointer events to gridEl
        try {
            gridEl.setPointerCapture(e.pointerId);
        } catch (err) {
            // Fallback for older browsers
        }

        tryAddOrBacktrackTile(tile);
    });

    // 2. Pointer Move: Detect element beneath finger/cursor
    gridEl.addEventListener('pointermove', (e) => {
        if (!isDragging) return;

        const target = document.elementFromPoint(e.clientX, e.clientY);
        const tile = target?.closest('img');

        if (!tile || !gridEl.contains(tile)) return;
        if (tile.id === lastHoveredTileId) return;

        lastHoveredTileId = tile.id;
        tryAddOrBacktrackTile(tile);
    });

    // 3. Pointer Up & Cancel: Safely reset drag state
    const stopDragging = (e) => {
        if (!isDragging) return;
        isDragging = false;
        lastHoveredTileId = null;
        try {
            if (gridEl.hasPointerCapture(e.pointerId)) {
                gridEl.releasePointerCapture(e.pointerId);
            }
        } catch (err) {
            // Fallback
        }
    };

    gridEl.addEventListener('pointerup', stopDragging);
    gridEl.addEventListener('pointercancel', stopDragging);
    gridEl.addEventListener('lostpointercapture', stopDragging);
}

const shuffleBtn = document.getElementById('shufflebtn');
if (shuffleBtn) {
    shuffleBtn.addEventListener('click', () => {
        shuffleInDOM();
        timesShuffled++;
    });
}

const forfeitBtn = document.getElementById('forfeitbtn');
if (forfeitBtn) {
    forfeitBtn.addEventListener('click', () => {
        forfeitStatus = 'Y';
        setBoardEnabled(false);
        // Telemetry removed: no remote submission
        forfeitBtn.disabled = true;
        showToast('Thanks for playing!', 2000);
    });
}

// ==================== HOW TO PLAY MODAL (visual-connections) ====================
(function() {
    const howToPlayModal = document.getElementById('how-to-play-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const gotItBtn = document.getElementById('got-it-btn');

    function openHowToPlayModal() {
        if (howToPlayModal) howToPlayModal.classList.remove('hidden');
    }

    function closeHowToPlayModal() {
        if (howToPlayModal) howToPlayModal.classList.add('hidden');
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeHowToPlayModal);
    if (gotItBtn) gotItBtn.addEventListener('click', closeHowToPlayModal);

    if (howToPlayModal) {
        howToPlayModal.addEventListener('click', (e) => {
            if (e.target === howToPlayModal) closeHowToPlayModal();
        });
    }

    window.addEventListener('DOMContentLoaded', () => {
        requestAnimationFrame(() => openHowToPlayModal());
    });
})();