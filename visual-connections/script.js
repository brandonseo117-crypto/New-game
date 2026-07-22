// ==========================================
// 1. GAME DATA & TELEMETRY STATE
// ==========================================
let array = [];
let selected = [];
let dailyCorrectMatches = [[5,16,4,3], [15,1,6,12], [14,10,2,8], [13,7,11,9]];
let lives = 0;
const matchedGroups = {
    0: 'Neuron 15',
    1: 'Neuron 13',
    2: 'Neuron 26',
    3: 'Neuron 38'
};

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

const arrayOfTimes = [];
const startTime = performance.now();
const arrFirstSelection = [startTime];
const arrFirstSubmission = [startTime];

// ==========================================
// 2. HELPER & ANALYTICS FUNCTIONS
// ==========================================
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

function getAvgTimes(arr) {
    const timePerQueries = [];
    for (let i = 0; i < arr.length; i += 2) {
        if (arr[i + 1]) timePerQueries.push(arr[i + 1] - arr[i]);
    }
    if (timePerQueries.length === 0) return 0;
    const sum = timePerQueries.reduce((total, num) => total + num, 0);
    return sum / timePerQueries.length;
}

function findFirstTimes(selectionArray, submissionArray) {
    const timeTillFirstSelection = (selectionArray[1] || selectionArray[0]) - selectionArray[0];
    const timeTillFirstSubmission = (submissionArray[1] || submissionArray[0]) - submissionArray[0];
    return [timeTillFirstSelection, timeTillFirstSubmission];
}

function formatIntoData(accuracy, incorrectAttempts, timePerQuery, timeTillFirstSelection, timeTillFirstSubmission, orderOfCorrectGuesses, timesShuffled, deselectionRate, deselectionEvents, totalTime, incorrectSelections, correctAdjustments, forfeitStatus) {
    return {
        'Accuracy': accuracy,
        'Incorrect guesses': incorrectAttempts,
        'Average time per selection': timePerQuery,
        'Time for first selection': timeTillFirstSelection,
        'Time for first submission': timeTillFirstSubmission, 
        'Order of correct guesses': orderOfCorrectGuesses,
        'Times board was shuffled': timesShuffled,
        'Deselection rate': deselectionRate,
        'Deselection events': deselectionEvents,
        'Total time to complete puzzle': totalTime,
        'Actual selection of incorrect choices': incorrectSelections,
        'Correct adjustments made after being told they are one away': correctAdjustments,
        'Forfeit?': forfeitStatus
    };
}

async function sendData(url, payload) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Fetch failed:', error.message);
    }
}

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
function appendAndRemove(el) {
    if (!el || el.classList.contains("correct-group")) return;

    const idNum = Number(el.id);
    const isCurrentlySelected = selected.includes(idNum);

    if (isCurrentlySelected) {
        selected = selected.filter(id => id !== idNum);
        el.isSelected = false;
        el.classList.remove("selected");
        deselectionEvents++;
    } else {
        if (selected.length < 4) {
            selected.push(idNum);
            el.isSelected = true;
            el.classList.add("selected");
        }
    }

    for (const candidate of array) {
        if (!candidate || candidate.classList.contains("correct-group")) continue;
        
        if (selected.length >= 4) {
            candidate.style.pointerEvents = selected.includes(Number(candidate.id)) ? "auto" : "none";
        } else {
            candidate.style.pointerEvents = "auto";
        }
    }
}

// Single Event Listener Initialization
for (let i = 0; i < 16; i++) {
    const button = document.getElementById(`${i + 1}`);
    if (button) {
        button.isSelected = false;
        array.push(button);
        
        button.addEventListener("click", function(event) {
            const clicked = event.currentTarget;
            if (arrFirstSelection.length === 1) arrFirstSelection.push(performance.now());
            
            appendAndRemove(clicked);
            arrayOfTimes.push(performance.now());
        });
    }
}

function setBoardEnabled(enabled) {
    for (const el of array) {
        if (!el) continue;
        if (enabled && el.classList.contains('correct-group')) {
            el.style.pointerEvents = 'none';
            continue;
        }
        el.style.pointerEvents = enabled ? 'auto' : 'none';
    }
}

function moveCorrectImagesToTopRow(correctIds, categoryLabel) {
    const container = document.querySelector('.images');
    if (!container || !Array.isArray(correctIds) || correctIds.length !== 4) return;

    // 1. Locate the 4 correct image elements
    const correctEls = correctIds.map((id) => document.getElementById(String(id))).filter(Boolean);
    if (correctEls.length !== 4) return;

    // 2. Remove the 4 solved image elements from the DOM
    correctEls.forEach((el) => {
        el.remove();
    });

    // 3. Remove them from internal tracking array
    array = array.filter(el => el && !correctIds.includes(Number(el.id)));

    // 4. Create the Category Banner element
    const banner = document.createElement('div');
    banner.className = 'category-banner correct-group'; // Keep 'correct-group' for shuffle filtering
    
    banner.innerHTML = `
        <div class="category-title">${categoryLabel}</div>
    `;

    // 5. Insert banner at the top of the grid container
    container.insertBefore(banner, container.firstChild);
}
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

            if (arrFirstSubmission.length === 1) arrFirstSubmission.push(performance.now());
            
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
                for (const idNum of selected) {
                    const el = document.getElementById(String(idNum));
                    if (!el) continue;
                    el.isSelected = false;
                    el.classList.remove("selected");
                    el.classList.add("correct");
                    el.style.pointerEvents = 'none';
                }

                moveCorrectImagesToTopRow(selected, matchedCategory);
                attempts++;
                correctAttempts++;
                accuracy = correctAttempts / attempts;
                deselectionRate = deselectionEvents / attempts;
                
                selected = [];
                setBoardEnabled(true);

                if (correctAttempts === 4) {
                    const totalTime = performance.now() - startTime;
                    const userData = formatIntoData(
                        accuracy, incorrectAttempts, getAvgTimes(arrayOfTimes), 
                        findFirstTimes(arrFirstSelection, arrFirstSubmission)[0], 
                        findFirstTimes(arrFirstSelection, arrFirstSubmission)[1], 
                        order, timesShuffled, deselectionRate, deselectionEvents, 
                        totalTime, incorrectSelections, correctAdjustments, forfeitStatus
                    );
                    
                    sendData('/api/retrive-data', userData);
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
                    const totalTime = performance.now() - startTime;
                    const userData = formatIntoData(
                        accuracy, incorrectAttempts, getAvgTimes(arrayOfTimes), 
                        findFirstTimes(arrFirstSelection, arrFirstSubmission)[0], 
                        findFirstTimes(arrFirstSelection, arrFirstSubmission)[1], 
                        order, timesShuffled, deselectionRate, deselectionEvents, 
                        totalTime, incorrectSelections, correctAdjustments, forfeitStatus
                    );
                    
                    sendData('/api/retrive-data', userData);
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

    // Re-append elements (banners first, then shuffled images)
    for (const el of [...fixedEls, ...shuffleEls]) {
        container.appendChild(el);
    }
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
        const totalTime = performance.now() - startTime;
        const userData = formatIntoData(
            accuracy, incorrectAttempts, getAvgTimes(arrayOfTimes), 
            findFirstTimes(arrFirstSelection, arrFirstSubmission)[0], 
            findFirstTimes(arrFirstSelection, arrFirstSubmission)[1], 
            order, timesShuffled, deselectionRate, deselectionEvents, 
            totalTime, incorrectSelections, correctAdjustments, forfeitStatus
        );
        sendData('/api/retrive-data', userData);
        forfeitBtn.disabled = true;
        showToast('Thanks for playing!', 2000);
    });
}