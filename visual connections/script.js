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
let attempts = 0;
let correctAttempts = 0;
let accuracy = 0;
let incorrectAttempts = 0;

function getAvgTimes(array) {
    const timePerQueries = [];
    for (let i=0; i < array.length; i+=2) {
        if (array[i+1]) timePerQueries.push(array[i+1]-array[i])
    };
    const sum = timePerQueries.reduce((total, num) => total + num, 0);
    const averageTime = sum / timePerQueries.length;

    return averageTime
};

function findFirstTimes(selectionArray, submissionArray) {
    const timeTillFirstSelection = selectionArray[1] - selectionArray[0];
    const timeTillFirstSubmission = submissionArray[1] - submissionArray[0];

    return [timeTillFirstSelection, timeTillFirstSubmission]
};

const order = [];
let timesShuffled = 0;
let deselectionRate = 0;
let deselectionEvents = 0;
// No need to make total time global
let incorrectSelections = [];
let correctAdjustments = 0;
let forfeitStatus = 'N';

function formatIntoData(accuracy, incorrectAttempts, timePerQuery, timeTillFirstSelection, timeTillFirstSubmission, orderOfCorrectGuesses, timesShuffled, deselectionRate, deselectionEvents, totalTime, incorrectSelections, correctAdjustments, forfeitStatus) {
    const userData = {
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
    }

    return userData
};

async function sendData(url, payload) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
            }
        const data = await response.json();
        return data;

        } catch (error) {
        console.error('Fetch failed:', error.message);
        throw error;
    }
};

const startTime = performance.now();

const arrFirstSelection = [startTime]
const arrFirstSubmission = [startTime]

const arrayOfTimes = [];

function lowToHigh(arr) {
    return arr.sort((a, b) => a - b);
}; // This is needed to order the selected buttons in ascending order so that they can be compared to the correct matches.

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

    if (selected.length >= 4) {
        for (const candidate of array) {
            if (!candidate || candidate.classList.contains("correct-group")) continue;
            candidate.disabled = !candidate.classList.contains("selected");
        }
    } else {
        for (const candidate of array) {
            if (!candidate || candidate.classList.contains("correct-group")) continue;
            candidate.disabled = false;
        }
    }
};
    // Enable or disable all interactive board elements
function setBoardEnabled(enabled) {
    for (const el of array) {
        if (!el) continue;
        if (enabled && el.classList.contains('correct-group')) {
            el.disabled = true;
            continue;
        }
        el.disabled = !enabled;
        if (!enabled) el.classList.add('locked');
        else el.classList.remove('locked');
    }
}

// Move a completed correct group into the top row and label it with the category.
function moveCorrectImagesToTopRow(correctIds, categoryLabel) {
    const container = document.querySelector('.images');
    if (!container || !Array.isArray(correctIds) || correctIds.length !== 4) return;

    const correctEls = correctIds
        .map((id) => document.getElementById(String(id)))
        .filter(Boolean);

    if (correctEls.length !== 4) return;

    correctEls.forEach((el) => {
        el.classList.add('correct-group');
        el.dataset.category = categoryLabel;
    });

    const fragment = document.createDocumentFragment();
    correctEls.forEach((el) => fragment.appendChild(el));
    container.insertBefore(fragment, container.firstChild);

    const existingLabel = document.querySelector('.correct-group-label');
    if (existingLabel) existingLabel.remove();
}

// Appends choices to the selected array so that they can be compared to the correct matches.

for (let i = 0; i < 16; i++) {
    const button = document.getElementById(`${i + 1}`);
    button.isSelected = false;
    array.push(button)};

for (let j = 0; j < array.length; j++) {
    const el = array[j];
    if (!el) continue;
    el.addEventListener("click", function(event) {
        const clicked = event.currentTarget;
        if (clicked.disabled) return;
        clicked.isSelected = !clicked.isSelected;
        if (arrFirstSelection.length == 1) arrFirstSelection.push(performance.now());
        const idx = array.indexOf(clicked);
        if (idx === -1) return;
        appendAndRemove(idx);
        const time = performance.now();
        arrayOfTimes.push(time);
        console.log('selected ts');
    });
};


function countCommonItems(arr1, arr2) {
    const set2 = new Set(arr2);
    return arr1.filter((value) => set2.has(value)).length;
}

let nudged = false

const submitBtn = document.getElementById("submitbtn");
submitBtn.addEventListener("click", function() {
        if (selected.length == 4) {
            if (arrFirstSubmission.length == 1) arrFirstSubmission.push(performance.now());
            const sortedSelected = lowToHigh([...selected]);
            let matchedCategory = null;
            let oneAway = false;

            for (const match of dailyCorrectMatches) {
                const sortedSelectedMatch = lowToHigh([...match]);
                if (JSON.stringify(sortedSelected) === JSON.stringify(sortedSelectedMatch)) {
                    matchedCategory = matchedGroups[dailyCorrectMatches.indexOf(match)];
                    break;
                }
                if (countCommonItems(sortedSelected, sortedSelectedMatch) === 3) {
                    oneAway = true;
                }
            }

            if (matchedCategory) {
                alert(`${matchedCategory}`);
                if (nudged === true) {
                    correctAdjustments++;
                    nudged = false
                };
                order.push(matchedCategory);
                for (const idNum of selected) {
                    const el = document.getElementById(String(idNum));
                    if (!el) continue;
                    el.classList.remove("selected");
                    el.classList.add("correct");
                    el.setAttribute('src', 'static/black.jpg');
                    el.disabled = true;
                };
                moveCorrectImagesToTopRow(selected, matchedCategory);
                attempts++;
                correctAttempts++;
                accuracy = correctAttempts / attempts;
                deselectionRate = deselectionEvents / attempts;
                console.log(accuracy);
                selected.splice(0, 4);
                setBoardEnabled(true);
                console.log(selected.length);
                if (correctAttempts == 4) {
                    const timeAtCompletetion = performance.now();
                    const totalTime = timeAtCompletetion - startTime;
                    const userData = formatIntoData(
                        accuracy, 
                        incorrectAttempts, 
                        getAvgTimes(arrayOfTimes), 
                        findFirstTimes(arrFirstSelection, arrFirstSubmission)[0], 
                        findFirstTimes(arrFirstSelection, arrFirstSubmission)[1], 
                        order, 
                        timesShuffled, 
                        deselectionRate, 
                        deselectionEvents, 
                        totalTime, 
                        incorrectSelections, 
                        correctAdjustments,
                        forfeitStatus
                    );
                    const url = '/api/retrive-data';
                    sendData(url, userData);
                    setBoardEnabled(false);
                    forfeitBtn.disabled = true;
                    alert('You win! Thank you for playing!')
                }
            }  else {
                if (oneAway) {
                    alert("You are one away from being correct!");
                    nudged = true
                }
                else {
                alert("Incorrect match. Please try again.");
                };
                incorrectSelections.push([...selected]);
                attempts++;
                incorrectAttempts++;
                accuracy = correctAttempts / attempts;
                deselectionRate = deselectionEvents / attempts;
                console.log(accuracy);
                lives++;
                
                for (let i=0; i < lives; i++) {
                    const lifeEl = document.getElementById(`life${4-i}`);
                    if (lifeEl) lifeEl.style.opacity = '0'
                };
                if (incorrectAttempts == 4) {
                    const timeAtCompletetion = performance.now();
                    const totalTime = timeAtCompletetion - startTime;
                    const userData = formatIntoData(
                        accuracy, 
                        incorrectAttempts, 
                        getAvgTimes(arrayOfTimes), 
                        findFirstTimes(arrFirstSelection, arrFirstSubmission)[0], 
                        findFirstTimes(arrFirstSelection, arrFirstSubmission)[1], 
                        order, 
                        timesShuffled, 
                        deselectionRate, 
                        deselectionEvents, 
                        totalTime, 
                        incorrectSelections, 
                        correctAdjustments,
                        forfeitStatus
                    );
                    const url = '/api/retrive-data';
                    sendData(url, userData);
                    setBoardEnabled(false);
                    forfeitBtn.disabled = true;
                    alert('Good try. Thank you for playing!')
                }
            }
        }
        else {
            alert("Please select 4 buttons before submitting.");
            console.log(selected.length);
        }
    }
); /* Creates a submit button that checks if the selected length is 4, sort from low to high, checks if any of the corrected matches match, 
and alerts if the match is correct or incorrect. If correct, it adds a CSS class to the selected button and disables them from being clicked again. */

function reroll() {
    let newIdx = randint(0,15)
    return newIdx
};

function shuffle(array) {
    for (let i = array.length-1; i>0; i--) {
        const j = Math.floor(Math.random() * (i+1));

        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
} // Fisher-Yates Algorithm

// Shuffle the backing array and also reorder the DOM children inside the .images container
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
};

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
        const timeAtCompletetion = performance.now();
        const totalTime = timeAtCompletetion - startTime;
        const userData = formatIntoData(
            accuracy, 
            incorrectAttempts, 
            getAvgTimes(arrayOfTimes), 
            findFirstTimes(arrFirstSelection, arrFirstSubmission)[0], 
            findFirstTimes(arrFirstSelection, arrFirstSubmission)[1], 
            order, 
            timesShuffled, 
            deselectionRate, 
            deselectionEvents, 
            totalTime, 
            incorrectSelections,
            correctAdjustments, 
            forfeitStatus
        );
        const url = '/api/retrive-data';
        sendData(url, userData);
        forfeitBtn.disabled = true;
        alert('Thanks for playing!');
    })
};