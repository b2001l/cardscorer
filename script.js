// script.js
const cardsPerRound = [7, 6, 5, 4, 3, 2, 3, 4, 5, 6, 7];
let playerCount = 0;
let playerNames = [];
let currentRound = 0;
let guesses = [];
let tricks = [];
let scores = [];

function setPlayerNames() {
  playerCount = parseInt(document.getElementById('playerCount').value);
  document.getElementById('setup').classList.add('hidden');
  document.getElementById('nameSetup').classList.remove('hidden');
  const nameInputs = document.getElementById('nameInputs');
  nameInputs.innerHTML = '';
  for (let i = 0; i < playerCount; i++) {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = `name${i}`;
    input.placeholder = `Player ${i + 1} name`;
    nameInputs.appendChild(input);
  }
}

function startGame() {
  playerNames = Array.from({ length: playerCount }, (_, i) =>
    document.getElementById(`name${i}`).value || `Player ${i + 1}`
  );
  scores = Array(playerCount).fill(0);
  currentRound = 0;
  document.getElementById('nameSetup').classList.add('hidden');
  document.getElementById('game').classList.remove('hidden');
  setupRound();
}

function setupRound() {
  guesses = Array(playerCount).fill(null);
  tricks = Array(playerCount).fill(null);

  document.getElementById('roundNumber').textContent = currentRound + 1;
  const cardsThisRound = cardsPerRound[currentRound];
  document.getElementById('cardsDealt').textContent = cardsThisRound;

  const dealerIndex = currentRound % playerCount;
  const firstGuesserIndex = (dealerIndex + 1) % playerCount;

  document.getElementById('dealerName').textContent = playerNames[dealerIndex];
  document.getElementById('firstGuesser').textContent = playerNames[firstGuesserIndex];

  const guessInputs = document.getElementById('guessInputs');
  guessInputs.innerHTML = '';

  const order = [];
  for (let i = 0; i < playerCount - 1; i++) {
    order.push((firstGuesserIndex + i) % playerCount);
  }
  order.push(dealerIndex);

  for (let i of order) {
    const input = document.createElement('input');
    input.type = 'number';
    input.id = `guess${i}`;
    input.min = 0;
    input.max = cardsThisRound;
    input.placeholder = `${playerNames[i]}'s guess`;
    input.addEventListener('input', updateDealerWarning);
    const group = document.createElement('div');
    group.className = 'input-group';
    group.appendChild(document.createTextNode(playerNames[i]));
    group.appendChild(input);
    guessInputs.appendChild(group);
  }

  updateDisplay();
}

function updateDealerWarning() {
  const dealerIndex = currentRound % playerCount;
  const cardsThisRound = cardsPerRound[currentRound];
  let total = 0;
  for (let i = 0; i < playerCount; i++) {
    const val = parseInt(document.getElementById(`guess${i}`)?.value);
    guesses[i] = isNaN(val) ? null : val;
    total += guesses[i] ?? 0;
  }
  const dealerInput = document.getElementById(`guess${dealerIndex}`);
  const dealerGuess = parseInt(dealerInput?.value);
  const restTotal = total - (isNaN(dealerGuess) ? 0 : dealerGuess);
  const forbidden = cardsThisRound - restTotal;
  const warning = document.getElementById('dealerWarning');
  if (!isNaN(dealerGuess) && dealerGuess === forbidden) {
    warning.textContent = `${playerNames[dealerIndex]} cannot guess ${forbidden} (total cannot match ${cardsThisRound})`;
  } else {
    warning.textContent = '';
  }
  updateDisplay();
}

function updateDisplay() {
  const guessDisplay = document.getElementById('guessDisplay');
  guessDisplay.innerHTML = `<h4>Guesses this round:</h4><ul>` +
    playerNames.map((name, i) =>
      `<li>${name}: ${guesses[i] ?? '-'}</li>`).join('') + `</ul>`;

  const resultInputs = document.getElementById('resultInputs');
  resultInputs.innerHTML = '';
  for (let i = 0; i < playerCount; i++) {
    const input = document.createElement('input');
    input.type = 'number';
    input.id = `result${i}`;
    input.min = 0;
    input.max = cardsPerRound[currentRound];
    input.placeholder = `${playerNames[i]} tricks`;
    const group = document.createElement('div');
    group.className = 'input-group';
    group.appendChild(document.createTextNode(playerNames[i]));
    group.appendChild(input);
    resultInputs.appendChild(group);
  }

  const scoreRows = document.getElementById('scoreRows');
  scoreRows.innerHTML = playerNames.map((p, i) =>
    `<tr><td>${p}</td><td>${guesses[i] ?? '-'}</td><td>${tricks[i] ?? '-'}</td><td>${scores[i]}</td></tr>`
  ).join('');
}

function submitResults() {
  for (let i = 0; i < playerCount; i++) {
    const val = parseInt(document.getElementById(`result${i}`).value);
    if (isNaN(val) || val < 0 || val > cardsPerRound[currentRound]) {
      alert(`Invalid tricks count for ${playerNames[i]}`);
      return;
    }
    tricks[i] = val;
  }
  for (let i = 0; i < playerCount; i++) {
    if (guesses[i] === tricks[i]) {
      scores[i] += 10 + 2 * guesses[i];
    } else {
      scores[i] -= 2 * Math.abs(guesses[i] - tricks[i]);
    }
  }
  currentRound++;
  if (currentRound >= cardsPerRound.length) {
    alert('Game Over! Final scores below.');
  }
  setupRound();
}
