document.addEventListener('DOMContentLoaded', () => {
    const fretboardContainer = document.getElementById('fretboard-container');
    const scoreDisplay = document.getElementById('score');
    const timeDisplay = document.getElementById('time');
    const timeDisplayContainer = timeDisplay.parentNode;
    const targetNoteDisplay = document.getElementById('target-note');
    const feedbackMessage = document.getElementById('feedback');
    const gameStartButton = document.getElementById('start-button'); // Renamed from gameStartButton to gameActionButton for clarity below
    const playButton = document.getElementById('play-button');
    const settingsButton = document.getElementById('settings-button');
    const backButton = document.getElementById('back-button');
    const backToMainButton = document.getElementById('back-to-main-button');
    const gameModeRadios = document.querySelectorAll('input[name="gameMode"]');
    const backgroundMusic = document.getElementById('background-music');

    const startScreen = document.getElementById('start-screen');
    const settingsScreen = document.getElementById('settings-screen');
    const gameScreen = document.getElementById('game-screen');

    const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const TUNING = ['E', 'A', 'D', 'G', 'B', 'E'];
    const NUM_FRETS_DISPLAYED = 12;

    let score = 0;
    let timeLeft = 60;
    let gameInterval;
    let currentTargetNoteIndex;

    let isTimedGame = true;

    // --- Screen Management Functions ---
    function showScreen(screenElement) {
        startScreen.classList.remove('active');
        settingsScreen.classList.remove('active');
        gameScreen.classList.remove('active');

        screenElement.classList.add('active');

        if (screenElement === startScreen) {
            if (backgroundMusic.paused) {
                backgroundMusic.play().catch(e => console.log("Autoplay prevented:", e));
            }
        }
    }

    // --- Game Logic Functions ---
    function getNoteName(stringIndex, fretNumber) {
        const openStringNoteIndex = NOTES.indexOf(TUNING[stringIndex]);
        if (openStringNoteIndex === -1) {
            console.error("Invalid tuning note:", TUNING[stringIndex]);
            return null;
        }
        const noteIndex = (openStringNoteIndex + fretNumber) % 12;
        return NOTES[noteIndex];
    }

    function createFretboard() {
        fretboardContainer.innerHTML = '';

        for (let f = 1; f <= NUM_FRETS_DISPLAYED; f++) {
            const fretBar = document.createElement('div');
            fretBar.classList.add('fret-bar', `fret-bar-${f}`);
            fretboardContainer.appendChild(fretBar);
        }

        for (let s = 0; s < TUNING.length; s++) {
            const stringLine = document.createElement('div');
            stringLine.classList.add('string-line', `string-line-${s}`);
            fretboardContainer.appendChild(stringLine);
        }

        const markerFrets = [3, 5, 7, 9];
        markerFrets.forEach(fretNum => {
            const marker = document.createElement('div');
            marker.className = `fretboard-marker fretboard-marker-${fretNum}`;
            fretboardContainer.appendChild(marker);
        });

        const marker12top = document.createElement('div');
        marker12top.className = 'fretboard-marker-12-top';
        fretboardContainer.appendChild(marker12top);

        const marker12bottom = document.createElement('div');
        marker12bottom.className = 'fretboard-marker-12-bottom';
        fretboardContainer.appendChild(marker12bottom);

        for (let s = 0; s < TUNING.length; s++) {
            for (let f = 1; f <= NUM_FRETS_DISPLAYED; f++) {
                const fretCellDiv = document.createElement('div');
                fretCellDiv.classList.add('fret-cell');
                fretCellDiv.dataset.string = s;
                fretCellDiv.dataset.fret = f;

                fretCellDiv.style.gridRow = s + 1;
                fretCellDiv.style.gridColumn = f;

                const noteDot = document.createElement('div');
                noteDot.classList.add('note-dot');
                noteDot.dataset.note = getNoteName(s, f);
                fretCellDiv.appendChild(noteDot);

                fretCellDiv.addEventListener('click', handleFretClick);
                fretboardContainer.appendChild(fretCellDiv);
            }
        }
    }

    function startGame() {
        if (gameInterval) {
            clearInterval(gameInterval); // Clear any existing interval if restarting
            gameInterval = null;
        }

        score = 0;
        timeLeft = 60; // Reset time for timed game
        scoreDisplay.textContent = score;

        if (isTimedGame) {
            timeDisplayContainer.classList.remove('hidden-time');
            timeDisplay.textContent = timeLeft;
            gameInterval = setInterval(() => {
                timeLeft--;
                timeDisplay.textContent = timeLeft;
                if (timeLeft <= 0) {
                    endGame();
                }
            }, 1000);
        } else {
            timeDisplayContainer.classList.add('hidden-time');
        }

        feedbackMessage.textContent = '';
        gameStartButton.disabled = false; // Enable button
        gameStartButton.textContent = 'RESTART GAME'; // Change text to RESTART

        resetFretboardHighlight();
        nextChallenge();
    }

    function endGame() {
        clearInterval(gameInterval);
        gameInterval = null;
        targetNoteDisplay.textContent = '_';
        feedbackMessage.textContent = `GAME OVER! YOUR SCORE: ${score}`;
        gameStartButton.disabled = false; // Enable button
        gameStartButton.textContent = 'START GAME'; // Change text back to START
        resetFretboardHighlight();
    }

    function resetGame() {
        if (gameInterval) {
            clearInterval(gameInterval);
            gameInterval = null;
        }
        score = 0;
        timeLeft = 60;
        scoreDisplay.textContent = score;
        timeDisplay.textContent = timeLeft;
        feedbackMessage.textContent = '';
        targetNoteDisplay.textContent = '_';
        gameStartButton.disabled = false; // Ensure start button is enabled
        gameStartButton.textContent = 'START GAME'; // Ensure text is START GAME
        resetFretboardHighlight();
        timeDisplayContainer.classList.remove('hidden-time');
    }

    function nextChallenge() {
        const randomString = Math.floor(Math.random() * TUNING.length);
        const randomFret = Math.floor(Math.random() * NUM_FRETS_DISPLAYED) + 1;

        currentTargetNoteIndex = NOTES.indexOf(getNoteName(randomString, randomFret));
        targetNoteDisplay.textContent = NOTES[currentTargetNoteIndex];

        feedbackMessage.textContent = '';
        resetFretboardHighlight();
    }

    function resetFretboardHighlight() {
        document.querySelectorAll('.note-dot').forEach(dot => {
            dot.classList.remove('active', 'correct-guess', 'incorrect-guess');
            dot.style.color = 'transparent';
        });
    }

    function handleFretClick(event) {
        if (isTimedGame && timeLeft <= 0 || !gameInterval) return;

        const clickedDot = event.currentTarget.querySelector('.note-dot');
        const clickedNote = clickedDot.dataset.note;
        const targetNote = NOTES[currentTargetNoteIndex];

        resetFretboardHighlight();

        clickedDot.style.color = '#fff';

        if (clickedNote === targetNote) {
            score += 10;
            feedbackMessage.textContent = 'CORRECT!';
            feedbackMessage.classList.add('correct');
            feedbackMessage.classList.remove('incorrect');
            clickedDot.classList.add('correct-guess');
            setTimeout(nextChallenge, 500);
        } else {
            score -= 5;
            feedbackMessage.textContent = `INCORRECT! THAT'S A ${clickedNote}.`;
            feedbackMessage.classList.add('incorrect');
            feedbackMessage.classList.remove('correct');
            clickedDot.classList.add('incorrect-guess');

            document.querySelectorAll(`.note-dot[data-note="${targetNote}"]`).forEach(dot => {
                if (dot !== clickedDot) {
                    dot.style.color = '#fff';
                    dot.classList.add('active');
                }
            });

            setTimeout(nextChallenge, 1500);
        }
        scoreDisplay.textContent = score;
    }

    // --- Event Listeners ---
    playButton.addEventListener('click', () => {
        showScreen(gameScreen);
        createFretboard();
        startGame(); // Start game according to current mode
    });

    settingsButton.addEventListener('click', () => {
        showScreen(settingsScreen);
    });

    backButton.addEventListener('click', () => {
        showScreen(startScreen);
    });

    backToMainButton.addEventListener('click', () => {
        resetGame(); // Reset game state before going back
        showScreen(startScreen);
    });

    // Handle the game's main action button
    gameStartButton.addEventListener('click', () => {
        // If button says 'RESTART GAME', it means a game is active
        if (gameStartButton.textContent === 'RESTART GAME') {
            startGame(); // Just restart the game
        } else { // Button says 'START GAME' (after game over)
            startGame();
        }
    });

    gameModeRadios.forEach(radio => {
        radio.addEventListener('change', (event) => {
            isTimedGame = event.target.value === 'timed';
            if (isTimedGame) {
                timeDisplayContainer.classList.remove('hidden-time');
                timeDisplay.textContent = timeLeft;
            } else {
                timeDisplayContainer.classList.add('hidden-time');
            }
        });
    });

    // Initial setup
    showScreen(startScreen);
    document.querySelector(`input[name="gameMode"][value="${isTimedGame ? 'timed' : 'untimed'}"]`).checked = true;
    if (!isTimedGame) {
        timeDisplayContainer.classList.add('hidden-time');
    }
});
