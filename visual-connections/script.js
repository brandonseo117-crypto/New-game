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

    // Clear active timer if user clicks quickly
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

// ==========================================
// 3. BOARD & SELECTION MANAGEMENT
// ==========================================
function appendAndRemove(idx) {
    const el = array[idx];
    if (!el || el.classList.contains("correct-group")) return;

    const idNum = Number(el.id);
    if (el.isSelected) {
        if (!selected.includes(idNum) && selected.length < 4) {
            selected.push(idNum);
        }
    } else if (selected.includes(idNum)) {
        selected.splice(selected.indexOf(idNum), 1);
        deselectionEvents++;
    }

    el.classList.toggle("selected");

    for (const candidate of array) {
        if (!candidate || candidate.classList.contains("correct-group")) continue;
        if (selected.length >= 4) {
            candidate.style.pointerEvents = candidate.classList.contains("selected") ? "auto" : "none";
        } else {
            candidate.style.pointerEvents = "auto";
        }
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

    const correctEls = correctIds.map((id) => document.getElementById(String(id))).filter(Boolean);
    if (correctEls.length !== 4) return;

    correctEls.forEach((el) => {
        el.classList.add('correct-group');
        el.dataset.category = categoryLabel;
    });

    const fragment = document.createDocumentFragment();
    correctEls.forEach((el) => fragment.appendChild(el));
    container.insertBefore(fragment, container.firstChild);
}

// Initialize Board Event Listeners
for (let i = 0; i < 16; i++) {
    const button = document.getElementById(`${i + 1}`);
    if (button) {
        button.isSelected = false;
        array.push(button);
        
        button.addEventListener("click", function(event) {
            const clicked = event.currentTarget;
            
            clicked.isSelected = !clicked.isSelected;
            if (arrFirstSelection.length === 1) arrFirstSelection.push(performance.now());
            
            const idx = array.indexOf(clicked);
            if (idx === -1) return;
            
            appendAndRemove(idx);
            arrayOfTimes.push(performance.now());
        });
    }
}

// ==========================================
// 4. SUBMIT, SHUFFLE & FORFEIT CONTROLS
// ==========================================
const submitBtn = document.getElementById("submitbtn");
if (submitBtn) {
    submitBtn.addEventListener("click", function() {
        if (selected.length === 4) {
            // Check if this exact combination was already guessed
            if (isAlreadyGuessed(selected, incorrectSelections)) {
                showToast("Already guessed!");
                return; // Stop execution without charging a life or penalty
            }

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
        } else {
            showToast("Please select 4 images.");
        }
    });
}

function shuffleInDOM() {
    const container = document.querySelector('.images');
    if (!container) return;

    const fixedEls = array.filter((el) => el && el.classList.contains('correct-group'));
    const shuffleEls = array.filter((el) => el && !el.classList.contains('correct-group'));

    for (let i = shuffleEls.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffleEls[i], shuffleEls[j]] = [shuffleEls[j], shuffleEls[i]];
    }

    array = [...fixedEls, ...shuffleEls];
    for (const el of array) {
        if (el) container.appendChild(el);
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
        alert('Thanks for playing!');
    });
}