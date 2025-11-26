// script.js

// Round structure: cards per player each round
const cardsPerRound = [7, 6, 5, 4, 3, 2, 3, 4, 5, 6, 7];
const STORAGE_KEY = 'cardGameScoreTracker_v1';
const THEME_STORAGE_KEY = 'cardGameTheme';

let playerCount = 0;
let playerNames = [];
let currentRound = 0;
let guesses = [];
let tricks = [];
let scores = [];
let history = []; // per-round history
let currentDealerIndex = 0;
let isEditingHistory = false; // New state variable

// --- Local storage helpers ---

function saveState() {
  const state = {
    playerCount,
    playerNames,
    currentRound,
    scores,
    history,
    // Store current guess/tricks state for resilience against refresh mid-round
    currentRoundGuesses: guesses,
    currentRoundTricks: tricks 
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state', e);
  }
}

function tryRestoreState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const state = JSON.parse(raw);

    if (!state || typeof state.playerCount !== 'number' || !Array.isArray(state.playerNames)) {
      return false;
    }

    playerCount = state.playerCount;
    playerNames = state.playerNames;
    currentRound = state.currentRound || 0;
    scores = Array.isArray(state.scores)
      ? state.scores
      : Array(playerCount).fill(0);
    history = Array.isArray(state.history) ? state.history : [];
    
    guesses = Array.isArray(state.currentRoundGuesses) ? state.currentRoundGuesses : Array(playerCount).fill(null);
    tricks = Array.isArray(state.currentRoundTricks) ? state.currentRoundTricks : Array(playerCount).fill(null);

    return true;
  } catch (e) {
    console.error('Failed to load state', e);
    return false;
  }
}

// --- Theme / Light/Dark Mode Helpers ---

function loadTheme() {
  const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'dark';
  applyTheme(savedTheme);
}

function applyTheme(theme) {
  const body = document.body;
  const themeToggle = document.getElementById('themeToggle');

  if (theme === 'light') {
    body.classList.add('light-mode');
    if (themeToggle) {
      themeToggle.textContent = '🌙 Dark Mode';
    }
  } else {
    body.classList.remove('light-mode');
    if (themeToggle) {
      themeToggle.textContent = '☀️ Light Mode';
    }
  }
}

function toggleTheme() {
  const isLight = document.body.classList.contains('light-mode');
  const newTheme = isLight ? 'dark' : 'light';
  
  localStorage.setItem(THEME_STORAGE_KEY, newTheme);
  applyTheme(newTheme);
}

// --- Setup stage handlers ---

function handleToNames() {
  const countInput = document.getElementById('playerCount');
  const value = parseInt(countInput.value, 10);

  if (isNaN(value) || value < 2 || value > 7) {
    alert('Please enter a number of players between 2 and 7.');
    return;
  }

  playerCount = value;
  document.getElementById('setup').classList.add('hidden');
  document.getElementById('nameSetup').classList.remove('hidden');

  const nameInputs = document.getElementById('nameInputs');
  nameInputs.innerHTML = '';

  for (let i = 0; i < playerCount; i++) {
    const group = document.createElement('div');
    group.className = 'input-group';

    const label = document.createElement('label');
    label.htmlFor = `name${i}`;
    label.textContent = `Player ${i + 1}`;

    const input = document.createElement('input');
    input.type = 'text';
    input.id = `name${i}`;
    input.placeholder = `Player ${i + 1} name`;

    group.appendChild(label);
    group.appendChild(input);
    nameInputs.appendChild(group);
  }
}

function handleBackToCount() {
  document.getElementById('nameSetup').classList.add('hidden');
  document.getElementById('setup').classList.remove('hidden');
}

function handleStartGame() {
  playerNames = Array.from({ length: playerCount }, (_, i) => {
    const val = document.getElementById(`name${i}`).value.trim();
    return val || `Player ${i + 1}`;
  });

  scores = Array(playerCount).fill(0);
  currentRound = 0;
  history = [];
  guesses = Array(playerCount).fill(null);
  tricks = Array(playerCount).fill(null);


  document.getElementById('nameSetup').classList.add('hidden');
  document.getElementById('game').classList.remove('hidden');

  saveState();
  setupRound();
  updateHistoryDisplay();
}

// --- Round setup & display ---

function setupRound() {
  if (currentRound >= cardsPerRound.length) {
    showGameOver();
    return;
  }
  
  // Disable editing when starting a new round entry
  isEditingHistory = false;
  const btnEditHistory = document.getElementById('btnEditHistory');
  if (btnEditHistory) btnEditHistory.classList.remove('hidden');
  const editHistoryActions = document.getElementById('editHistoryActions');
  if (editHistoryActions) editHistoryActions.classList.add('hidden');

  const guessesSubmitted = guesses.every(g => g !== null);

  const roundNumberElem = document.getElementById('roundNumber');
  const cardsDealtElem = document.getElementById('cardsDealt');
  const dealerNameElem = document.getElementById('dealerName');
  const firstGuesserElem = document.getElementById('firstGuesser');
  const dealerWarningElem = document.getElementById('dealerWarning');
  const trickWarningElem = document.getElementById('trickWarning');
  const guessSection = document.getElementById('guessSection');
  const trickSection = document.getElementById('trickSection');

  const cardsThisRound = cardsPerRound[currentRound];
  const dealerIndex = currentRound % playerCount;
  const firstGuesserIndex = (dealerIndex + 1) % playerCount;
  currentDealerIndex = dealerIndex;

  roundNumberElem.textContent = currentRound + 1;
  cardsDealtElem.textContent = cardsThisRound;
  dealerNameElem.textContent = playerNames[dealerIndex];
  firstGuesserElem.textContent = playerNames[firstGuesserIndex];

  dealerWarningElem.textContent = '';
  trickWarningElem.textContent = '';
  
  // Set visibility based on whether guesses were already submitted
  if (guessesSubmitted) {
      guessSection.classList.add('hidden');
      trickSection.classList.remove('hidden');
  } else {
      guessSection.classList.remove('hidden');
      trickSection.classList.add('hidden');
      if (history.length === currentRound) {
        guesses = Array(playerCount).fill(null);
        tricks = Array(playerCount).fill(null);
      }
  }

  // Build guess inputs in proper order
  const guessInputs = document.getElementById('guessInputs');
  guessInputs.innerHTML = '';

  const order = [];
  for (let i = 0; i < playerCount - 1; i++) {
    order.push((firstGuesserIndex + i) % playerCount);
  }
  order.push(dealerIndex); // dealer guesses last

  for (let i of order) {
    const group = document.createElement('div');
    group.className = 'input-group';
    group.dataset.playerIndex = i;

    const label = document.createElement('label');
    label.htmlFor = `guess${i}`;
    label.textContent = playerNames[i];

    const input = document.createElement('input');
    input.type = 'number';
    input.id = `guess${i}`;
    input.min = 0;
    input.max = cardsThisRound;
    input.placeholder = `${playerNames[i]}'s guess`;
    
    if (guesses[i] !== null) {
        input.value = guesses[i];
    }

    input.addEventListener('input', updateDealerWarning);

    group.appendChild(label);
    group.appendChild(input);
    guessInputs.appendChild(group);
  }

  updateDisplay();
  updateHistoryDisplay();
}

function collectGuesses() {
  const safeRoundIndex = Math.min(currentRound, cardsPerRound.length - 1);
  const cardsThisRound = cardsPerRound[safeRoundIndex];
  let total = 0;

  for (let i = 0; i < playerCount; i++) {
    const input = document.getElementById(`guess${i}`);
    if (!input) {
      guesses[i] = null;
      continue;
    }

    const val = parseInt(input.value, 10);
    if (isNaN(val) || val < 0 || val > cardsThisRound) {
      guesses[i] = null;
    } else {
      guesses[i] = val;
      total += val;
    }
  }

  return total;
}

function updateDealerWarning() {
  const dealerIndex = currentRound % playerCount;
  const safeRoundIndex = Math.min(currentRound, cardsPerRound.length - 1);
  const cardsThisRound = cardsPerRound[safeRoundIndex];
  const dealerWarning = document.getElementById('dealerWarning');

  const total = collectGuesses();
  const dealerInput = document.getElementById(`guess${dealerIndex}`);
  const dealerGuess = parseInt(dealerInput?.value, 10);

  const restTotal = total - (isNaN(dealerGuess) ? 0 : dealerGuess);
  const forbidden = cardsThisRound - restTotal;

  if (!isNaN(dealerGuess) && dealerGuess === forbidden) {
    dealerWarning.textContent = `${playerNames[dealerIndex]} cannot guess ${forbidden} (total guesses cannot equal ${cardsThisRound}).`;
  } else {
    dealerWarning.textContent = '';
  }

  updateDisplay();
}

function applyDealerHighlight(dealerIndex) {
  document.querySelectorAll('.dealer-highlight').forEach(el => {
    el.classList.remove('dealer-highlight');
  });

  document
    .querySelectorAll(`.input-group[data-player-index="${dealerIndex}"]`)
    .forEach(el => el.classList.add('dealer-highlight'));

  document
    .querySelectorAll(`tr[data-player-index="${dealerIndex}"]`)
    .forEach(el => el.classList.add('dealer-highlight'));
}

function updateDisplay() {
  const guessDisplay = document.getElementById('guessDisplay');
  guessDisplay.innerHTML =
    `<h4>Guesses this round:</h4><ul>` +
    playerNames
      .map((name, i) => `<li>${name}: ${guesses[i] ?? '-'}</li>`)
      .join('') +
    `</ul>`;

  const resultInputs = document.getElementById('resultInputs');
  resultInputs.innerHTML = '';

  const safeRoundIndex = Math.min(currentRound, cardsPerRound.length - 1);
  const cardsThisRound = cardsPerRound[safeRoundIndex];

  for (let i = 0; i < playerCount; i++) {
    const group = document.createElement('div');
    group.className = 'input-group';
    group.dataset.playerIndex = i;

    const label = document.createElement('label');
    label.htmlFor = `result${i}`;
    label.textContent = playerNames[i];

    const input = document.createElement('input');
    input.type = 'number';
    input.id = `result${i}`;
    input.min = 0;
    input.max = cardsThisRound;
    input.placeholder = `${playerNames[i]} tricks`;
    
    if (tricks[i] !== null) {
        input.value = tricks[i];
    }

    group.appendChild(label);
    group.appendChild(input);
    resultInputs.appendChild(group);
  }

  const scoreRows = document.getElementById('scoreRows');
  if (playerCount > 0) {
    const dealerIndex = currentDealerIndex % playerCount;
    const firstGuesserIndex = (dealerIndex + 1) % playerCount;

    const order = [];
    for (let i = 0; i < playerCount - 1; i++) {
      order.push((firstGuesserIndex + i) % playerCount);
    }
    order.push(dealerIndex); 

    scoreRows.innerHTML = order
      .map(
        (i) =>
          `<tr data-player-index="${i}">
            <td>${playerNames[i]}</td>
            <td>${guesses[i] ?? '-'}</td>
            <td>${tricks[i] ?? '-'}</td>
            <td>${scores[i]}</td>
          </tr>`
      )
      .join('');
  } else {
    scoreRows.innerHTML = '';
  }

  applyDealerHighlight(currentDealerIndex);
}

// --- Submit Guesses Step ---

function submitGuesses() {
  const safeRoundIndex = Math.min(currentRound, cardsPerRound.length - 1);
  const cardsThisRound = cardsPerRound[safeRoundIndex];
  const dealerIndex = currentRound % playerCount;
  const dealerWarning = document.getElementById('dealerWarning');

  const totalGuesses = collectGuesses();

  for (let i = 0; i < playerCount; i++) {
    if (guesses[i] === null) {
      alert(`Please enter a valid guess (0–${cardsThisRound}) for ${playerNames[i]}.`);
      return;
    }
  }

  if (totalGuesses === cardsThisRound) {
    dealerWarning.textContent = `${playerNames[dealerIndex]} cannot guess ${cardsThisRound - (totalGuesses - guesses[dealerIndex])} (total guesses cannot equal ${cardsThisRound}).`;
    alert(`Total guesses cannot equal ${cardsThisRound}. Please adjust the dealer's guess.`);
    return;
  }
  
  dealerWarning.textContent = '';

  saveState(); 

  document.getElementById('guessSection').classList.add('hidden');
  document.getElementById('trickSection').classList.remove('hidden');
  
  updateDisplay(); 
}

// --- Validation & scoring ---

function calculateRoundScore(guess, tricks) {
    if (guess === tricks) {
      return 10 + 2 * guess;
    } else {
      return -2 * Math.abs(guess - tricks);
    }
}

function validateGuessesAndResults() {
  const safeRoundIndex = Math.min(currentRound, cardsPerRound.length - 1);
  const cardsThisRound = cardsPerRound[safeRoundIndex];
  const trickWarning = document.getElementById('trickWarning');

  trickWarning.textContent = '';

  if (guesses.some(g => g === null)) {
     alert("Error: Guesses were not submitted. Please refresh and re-enter guesses.");
     document.getElementById('guessSection').classList.remove('hidden');
     document.getElementById('trickSection').classList.add('hidden');
     return false;
  }

  let totalTricks = 0;
  for (let i = 0; i < playerCount; i++) {
    const input = document.getElementById(`result${i}`);
    const val = parseInt(input.value, 10);

    if (isNaN(val) || val < 0 || val > cardsThisRound) {
      alert(`Please enter a valid tricks count (0–${cardsThisRound}) for ${playerNames[i]}.`);
      return false;
    }
    tricks[i] = val;
    totalTricks += val;
  }

  if (totalTricks !== cardsThisRound) {
    trickWarning.textContent = `Total tricks recorded (${totalTricks}) should equal cards this round (${cardsThisRound}).`;
    const proceed = confirm(
      `Total tricks recorded (${totalTricks}) do not equal cards this round (${cardsThisRound}). Do you still want to continue?`
    );
    if (!proceed) {
      return false;
    }
  }

  return true;
}

function submitResults() {
  if (!validateGuessesAndResults()) {
    return;
  }

  const safeRoundIndex = Math.min(currentRound, cardsPerRound.length - 1);
  // const cardsThisRound = cardsPerRound[safeRoundIndex]; // Already calculated in validateGuessesAndResults

  const deltas = [];
  for (let i = 0; i < playerCount; i++) {
    const delta = calculateRoundScore(guesses[i], tricks[i]);
    deltas.push(delta);
  }
  
  // Update scores using the current round's delta before saving to history
  for (let i = 0; i < playerCount; i++) {
    scores[i] += deltas[i];
  }

  const scoresAfter = scores.slice();

  history.push({
    roundIndex: currentRound,
    cardsThisRound: cardsPerRound[safeRoundIndex],
    guesses: [...guesses],
    tricks: [...tricks],
    deltas,
    scoresAfter
  });

  currentRound++;
  
  // Clear mid-round state for the next round
  guesses = Array(playerCount).fill(null);
  tricks = Array(playerCount).fill(null);

  saveState();
  updateHistoryDisplay();

  if (currentRound >= cardsPerRound.length) {
    showGameOver();
  } else {
    setupRound();
  }
}


// --- History Editing and Recalculation ---

function recalculateScores() {
    // Reset all scores to zero
    scores = Array(playerCount).fill(0);

    for (const entry of history) {
        entry.deltas = [];
        for (let i = 0; i < playerCount; i++) {
            // Recalculate delta using potentially edited tricks (and existing guess)
            const delta = calculateRoundScore(entry.guesses[i], entry.tricks[i]);
            entry.deltas.push(delta);
            
            // Update running total score
            scores[i] += delta;
        }
        // Update the scoresAfter field for the history entry
        entry.scoresAfter = scores.slice();
    }
    
    // Save new state
    saveState();
    
    // Refresh display
    updateDisplay();
    // updateHistoryDisplay is called in handleSaveHistory after the recalculation
    
    // If the game was over, re-evaluate winner
    if (currentRound >= cardsPerRound.length) {
        showGameOver();
    }
}

function handleEditHistory() {
    if (history.length === 0) {
        alert("No rounds have been completed yet to edit.");
        return;
    }
    
    isEditingHistory = true;
    document.getElementById('btnEditHistory').classList.add('hidden');
    document.getElementById('editHistoryActions').classList.remove('hidden');
    document.getElementById('editHistoryWarning').textContent = "Only Tricks can be edited. Saving will recalculate all subsequent scores.";
    
    // Re-render the history table to be editable
    updateHistoryDisplay();
}

function handleCancelEdit() {
    isEditingHistory = false;
    document.getElementById('btnEditHistory').classList.remove('hidden');
    document.getElementById('editHistoryActions').classList.add('hidden');
    // Re-render the history table to be non-editable (resets any unsaved changes by using the stored history)
    updateHistoryDisplay();
}

function handleSaveHistory() {
    const editHistoryWarning = document.getElementById('editHistoryWarning');
    editHistoryWarning.textContent = '';
    
    // 1. Collect all edited tricks from the table
    const tableRows = document.getElementById('historyRows').querySelectorAll('tr');
    
    let validEdit = true;
    
    tableRows.forEach((row, roundIdx) => {
        const entry = history[roundIdx];
        const cardsThisRound = entry.cardsThisRound;
        const trickCells = row.querySelectorAll('.editable-trick'); 
        
        trickCells.forEach((cell, playerIdx) => {
            const val = parseInt(cell.value, 10);
            
            if (isNaN(val) || val < 0 || val > cardsThisRound) {
                validEdit = false;
                editHistoryWarning.textContent = `Error in Round ${roundIdx + 1}: Tricks must be between 0 and ${cardsThisRound}.`;
                cell.style.border = '2px solid red';
            } else {
                entry.tricks[playerIdx] = val;
                cell.style.border = '1px solid var(--border-color)';
            }
        });
    });
    
    if (!validEdit) {
        return;
    }

    // 2. Recalculate and Save
    recalculateScores();
    
    // 3. Exit edit mode
    isEditingHistory = false;
    document.getElementById('btnEditHistory').classList.remove('hidden');
    document.getElementById('editHistoryActions').classList.add('hidden');
    
    // FIX APPLIED: Rerender history table to switch back to non-editable text view
    updateHistoryDisplay(); 
}


// --- Round history display ---

function updateHistoryDisplay() {
  const headerRow = document.getElementById('historyHeaderRow');
  const tbody = document.getElementById('historyRows');
  const summaryElem = document.getElementById('historySummary');

  if (!headerRow || !tbody || !summaryElem) return;

  // Build header: Round | Player 1 | Player 2 | ...
  headerRow.innerHTML = '';
  const thRound = document.createElement('th');
  thRound.textContent = 'Round';
  headerRow.appendChild(thRound);

  playerNames.forEach(name => {
    const th = document.createElement('th');
    th.textContent = name;
    headerRow.appendChild(th);
  });

  // Build rows: one per round
  tbody.innerHTML = history
    .map((entry, roundIdx) => {
      const roundNumber = entry.roundIndex + 1;
      let rowHtml = `<tr><td>${roundNumber} (${entry.cardsThisRound})</td>`;

      for (let i = 0; i < playerNames.length; i++) {
        const g = entry.guesses[i];
        const t = entry.tricks[i];
        const delta = entry.deltas[i];
        const deltaStr = delta > 0 ? `+${delta}` : delta;
        
        let content;
        if (isEditingHistory) {
            // Editable tricks input (Only tricks are editable, not guesses)
            content = `<span style="display:block; margin-bottom: 5px;">Guess: ${g}</span>
                       <input 
                            type="number" 
                            value="${t}" 
                            min="0" 
                            max="${entry.cardsThisRound}" 
                            class="editable-trick" 
                            aria-label="Tricks for ${playerNames[i]} in round ${roundNumber}"
                            style="width: 50px; text-align: center; background-color: var(--background-color); color: var(--text-color); border: 1px solid var(--border-color); padding: 5px;">`;
        } else {
            // Compact: "guess/tricks (Δ)"
            content = `${g}/${t} (${deltaStr})`;
        }

        rowHtml += `<td>${content}</td>`;
      }

      rowHtml += `</tr>`;
      return rowHtml;
    })
    .join('');

  // Mini summary
  if (history.length === 0 || scores.length === 0) {
    summaryElem.textContent = 'No rounds played yet.';
    return;
  }

  const roundsPlayed = history.length;
  const maxScore = Math.max(...scores);
  const leaderIndices = scores
    .map((s, i) => (s === maxScore ? i : null))
    .filter(i => i !== null);

  if (leaderIndices.length === 1) {
    const leaderName = playerNames[leaderIndices[0]];
    const sortedScores = [...scores].sort((a, b) => b - a);
    const second = sortedScores[1];
    if (second !== undefined) {
      const lead = maxScore - second;
      summaryElem.textContent = `${leaderName} leads with ${maxScore} points, ahead by ${lead} after ${roundsPlayed} round${roundsPlayed > 1 ? 's' : ''}.`;
    } else {
      summaryElem.textContent = `${leaderName} leads with ${maxScore} points after ${roundsPlayed} round${roundsPlayed > 1 ? 's' : ''}.`;
    }
  } else {
    const names = leaderIndices.map(i => playerNames[i]).join(', ');
    summaryElem.textContent = `It's a tie between ${names} at ${maxScore} points after ${roundsPlayed} round${roundsPlayed > 1 ? 's' : ''}.`;
  }
}

function showGameOver() {
  updateDisplay();
  updateHistoryDisplay();
  saveState();

  const gameOverSection = document.getElementById('gameOver');
  const winnerText = document.getElementById('winnerText');

  const maxScore = Math.max(...scores);
  const winners = playerNames.filter((_, i) => scores[i] === maxScore);

  if (winners.length === 1) {
    winnerText.textContent = `${winners[0]} wins with ${maxScore} points!`;
  } else {
    winnerText.textContent = `It's a tie between ${winners.join(', ')} with ${maxScore} points!`;
  }

  gameOverSection.classList.remove('hidden');
}

function startNewGame() {
  playerCount = 0;
  playerNames = [];
  currentRound = 0;
  guesses = [];
  tricks = [];
  scores = [];
  history = [];
  currentDealerIndex = 0;

  document.getElementById('game').classList.add('hidden');
  document.getElementById('gameOver').classList.add('hidden');
  document.getElementById('nameSetup').classList.add('hidden');
  document.getElementById('setup').classList.remove('hidden');
  document.getElementById('nameInputs').innerHTML = '';

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear state', e);
  }

  updateHistoryDisplay();
}

// --- Init: attach listeners & restore ---

document.addEventListener('DOMContentLoaded', () => {
  loadTheme();
  
  document.getElementById('btnToNames').addEventListener('click', handleToNames);
  document.getElementById('btnBackToCount').addEventListener('click', handleBackToCount);
  document.getElementById('btnStartGame').addEventListener('click', handleStartGame);
  document.getElementById('btnSubmitGuesses').addEventListener('click', submitGuesses);
  document.getElementById('btnSubmitRound').addEventListener('click', submitResults);
  document.getElementById('btnNewGame').addEventListener('click', startNewGame);
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  
  // History Edit Listeners
  const btnEditHistory = document.getElementById('btnEditHistory');
  if (btnEditHistory) btnEditHistory.addEventListener('click', handleEditHistory);
  const btnSaveHistory = document.getElementById('btnSaveHistory');
  if (btnSaveHistory) btnSaveHistory.addEventListener('click', handleSaveHistory);
  const btnCancelEdit = document.getElementById('btnCancelEdit');
  if (btnCancelEdit) btnCancelEdit.addEventListener('click', handleCancelEdit);


  const hasState = tryRestoreState();
  if (hasState && playerCount > 0) {
    const resume = confirm('Resume your previous game?');
    if (resume) {
      document.getElementById('setup').classList.add('hidden');
      document.getElementById('nameSetup').classList.add('hidden');
      document.getElementById('game').classList.remove('hidden');

      setupRound();
      updateHistoryDisplay();
    } else {
      try {
        localStorage.removeItem(STORAGE_KEY);
        playerCount = 0;
        playerNames = [];
        currentRound = 0;
        scores = [];
        history = [];
      } catch (e) {
        console.error('Failed to clear state', e);
      }
      updateHistoryDisplay();
    }
  } else {
    updateHistoryDisplay();
  }
});
