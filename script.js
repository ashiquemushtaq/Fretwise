document.addEventListener('DOMContentLoaded', () => {
    const fretboardContainer = document.getElementById('fretboard-container');
    const scoreDisplay = document.getElementById('score');
    const timeDisplay = document.getElementById('time');
    const timeDisplayContainer = timeDisplay.parentNode; // This is the 'score-display' div
    const targetNoteDisplay = document.getElementById('target-note');
    const feedbackMessage = document.getElementById('feedback');
    const gameStartButton = document.getElementById('start-button');
    const playButton = document.getElementById('play-button');
    const settingsButton = document.getElementById('settings-button');
    const backButton = document.getElementById('back-button'); // Settings screen back button
    const backToMainButton = document.getElementById('back-to-main-button'); // Game screen back button
    const gameModeRadios = document.querySelectorAll('input[name="gameMode"]');
    const backgroundMusic = document.getElementById('background-music');

    const startScreen = document.getElementById('start-screen');
    const settingsScreen = document.getElementById('settings-screen');
    const gameScreen = document.getElementById('game-screen');

    const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const TUNING = ['E', 'A', 'D', 'G', 'B', 'E']; // Standard EADGBe tuning (Low E is index 0, High E is index 5)
    const NUM_FRETS_DISPLAYED = 12; // Number of *fret spaces* to display (Fret 1 to Fret 12)

    let score = 0;
    let timeLeft = 60; // seconds
    let gameInterval;
    let currentTargetNoteIndex;

    let isTimedGame = true; // State variable for game mode

    // --- Screen Management Functions ---
    function showScreen(screenElement) {
        startScreen.classList.remove('active');
        settingsScreen.classList.remove('active');
        gameScreen.classList.remove('active');

        screenElement.classList.add('active');

        // Music control based on screen
        if (screenElement === gameScreen) {
            // Play music only when entering the game screen
            if (backgroundMusic.paused) {
                backgroundMusic.play().catch(e => console.log("Music autoplay prevented:", e));
            }
        } else {
            // Pause music when navigating away from the game screen (to start or settings)
            if (!backgroundMusic.paused) {
                backgroundMusic.pause();
                backgroundMusic.currentTime = 0; // Optional: Reset music to start for next game
            }
        }
    }

    // --- Game Logic Functions ---
    /**
     * Calculates the note name for a given string and fret.
     * @param {number} stringIndex - The index of the string (0 for Low E, 5 for High E).
     * @param {number} fretNumber - The fret number (1 to NUM_FRETS_DISPLAYED).
     * @returns {string} The note name (e.g., 'A', 'C#').
     */
    function getNoteName(stringIndex, fretNumber) {
        const openStringNoteIndex = NOTES.indexOf(TUNING[stringIndex]);
        if (openStringNoteIndex === -1) {
            console.error("Invalid tuning note:", TUNING[stringIndex]);
            return null;
        }
        const noteIndex = (openStringNoteIndex + fretNumber) % 12;
        return NOTES[noteIndex];
    }

    /**
     * Dynamically creates the guitar fretboard elements (fret bars, strings, markers, clickable cells).
     */
    function createFretboard() {
        fretboardContainer.innerHTML = ''; // Clear existing fretboard

        // Add FRET BARS as separate elements (positioned absolutely)
        for (let f = 1; f <= NUM_FRETS_DISPLAYED; f++) {
            const fretBar = document.createElement('div');
            fretBar.classList.add('fret-bar', `fret-bar-${f}`);
            fretboardContainer.appendChild(fretBar);
        }

        // Add STRING LINES as separate elements (positioned absolutely)
        // Note: TUNING array is Low E to High E. We want top of fretboard to be Low E.
        // So, string-line-0 corresponds to TUNING[0] (Low E)
        for (let s = 0; s < TUNING.length; s++) {
            const stringLine = document.createElement('div');
            stringLine.classList.add('string-line', `string-line-${s}`);
            fretboardContainer.appendChild(stringLine);
        }

        // Add fret markers (dots) dynamically
        const markerFrets = [3, 5, 7, 9];
        markerFrets.forEach(fretNum => {
            const marker = document.createElement('div');
            marker.className = `fretboard-marker fretboard-marker-${fretNum}`;
            fretboardContainer.appendChild(marker);
        });

        // Add double markers for 12th fret
        const marker12top = document.createElement('div');
        marker12top.className = 'fretboard-marker-12-top';
        fretboardContainer.appendChild(marker12top);

        const marker12bottom = document.createElement('div');
        marker12bottom.className = 'fretboard-marker-12-bottom';
        fretboardContainer.appendChild(marker12bottom);


        // Create grid cells for each string and fret position (these are the clickable areas)
        // They sit on top of the bars and strings
        for (let s = 0; s < TUNING.length; s++) { // s for string (row)
            for (let f = 1; f <= NUM_FRETS_DISPLAYED; f++) { // f for fret (column)
                const fretCellDiv = document.createElement('div');
                fretCellDiv.classList.add('fret-cell');
                fretCellDiv.dataset.string = s; // Store original string index
                fretCellDiv.dataset.fret = f;   // Store the actual fret number

                // Set grid position for the clickable cell
                fretCellDiv.style.gridRow = s + 1; // Grid rows are 1-indexed (Low E is row 1)
                fretCellDiv.style.gridColumn = f;   // Grid columns are 1-indexed

                const noteDot = document.createElement('div');
                noteDot.classList.add('note-dot');
                noteDot.dataset.note = getNoteName(s, f);
                fretCellDiv.appendChild(noteDot);

                fretCellDiv.addEventListener('click', handleFretClick);
                fretboardContainer.appendChild(fretCellDiv);
            }
        }
    }

    /**
     * Starts a new game or restarts the current one.
     */
    function startGame() {
        // Stop any running game before starting a new one
        if (gameInterval) {
            clearInterval(gameInterval);
            gameInterval = null;
        }

        score = 0;
        timeLeft = 60; // Reset time for timed game
        scoreDisplay.textContent = score;

        // --- Control visibility of the Time display and 's' suffix ---
        const timeSuffix = document.querySelector('.time-suffix'); // Get the 's' span

        if (isTimedGame) {
            timeDisplayContainer.classList.remove('hidden-time');
            timeDisplay.textContent = timeLeft;
            // Hide 's' for very small screens (defined by media query breakpoint, or just check window.innerWidth)
            if (window.innerWidth <= 400) { // Assuming 400px is the breakpoint for hiding 's'
                if (timeSuffix) timeSuffix.style.display = 'none';
            } else {
                if (timeSuffix) timeSuffix.style.display = 'inline';
            }
            gameInterval = setInterval(() => {
                timeLeft--;
                timeDisplay.textContent = timeLeft;
                if (timeLeft <= 0) {
                    endGame();
                }
            }, 1000);
        } else {
            timeDisplayContainer.classList.add('hidden-time'); // Hide the whole "Time: XXs" part
            if (timeSuffix) timeSuffix.style.display = 'none'; // Ensure 's' is hidden even if parent is not display:none
            // No interval set for untimed game
        }
        // --- End of Time display control section ---

        feedbackMessage.textContent = '';
        gameStartButton.disabled = false; // Enable button
        gameStartButton.textContent = 'RESTART GAME'; // Change text to RESTART

        resetFretboardHighlight(); // Clear any previous highlights
        nextChallenge(); // Generate the first challenge
    }

    /**
     * Ends the current game.
     */
    function endGame() {
        clearInterval(gameInterval);
        gameInterval = null;
        targetNoteDisplay.textContent = '_';
        feedbackMessage.textContent = `GAME OVER! YOUR SCORE: ${score}`;
        gameStartButton.disabled = false; // Enable button
        gameStartButton.textContent = 'START GAME'; // Change text back to START
        resetFretboardHighlight(); // Clear any remaining highlights
    }

    /**
     * Resets the game state completely, typically when returning to the main menu.
     */
    function resetGame() {
        if (gameInterval) {
            clearInterval(gameInterval);
            gameInterval = null;
        }
        score = 0;
        timeLeft = 60;
        scoreDisplay.textContent = score;
        timeDisplay.textContent = timeLeft; // Reset time display text
        feedbackMessage.textContent = '';
        targetNoteDisplay.textContent = '_';
        gameStartButton.disabled = false; // Ensure start button is enabled for new game
        gameStartButton.textContent = 'START GAME'; // Ensure text is START GAME
        resetFretboardHighlight(); // Clear all highlights

        // Ensure time display is visible when returning to start screen (in case user wants to start timed game)
        timeDisplayContainer.classList.remove('hidden-time');
        const timeSuffix = document.querySelector('.time-suffix'); // Get the 's' span
        if (timeSuffix) timeSuffix.style.display = 'inline'; // Show 's' by default on main menu
    }

    /**
     * Generates the next note identification challenge.
     */
    function nextChallenge() {
        // Generate a random string and fret for the challenge
        const randomString = Math.floor(Math.random() * TUNING.length);
        const randomFret = Math.floor(Math.random() * NUM_FRETS_DISPLAYED) + 1; // +1 because frets start from 1

        currentTargetNoteIndex = NOTES.indexOf(getNoteName(randomString, randomFret));
        targetNoteDisplay.textContent = NOTES[currentTargetNoteIndex];

        feedbackMessage.textContent = ''; // Clear previous feedback
        resetFretboardHighlight(); // Clear highlights from previous challenge
    }

    /**
     * Clears all temporary visual highlights from the fretboard.
     */
    function resetFretboardHighlight() {
        document.querySelectorAll('.note-dot').forEach(dot => {
            dot.classList.remove('active', 'correct-guess', 'incorrect-guess');
            dot.style.color = 'transparent'; // Hide note names again
        });
    }

    /**
     * Handles a click event on a fret. Checks if the clicked note is correct.
     * @param {Event} event - The click event object.
     */
    function handleFretClick(event) {
        // If untimed, allow clicks even if `timeLeft` theoretically hits 0.
        // If timed, only allow if timeLeft > 0.
        if (isTimedGame && timeLeft <= 0 || !gameInterval) return; // Prevent clicks if game is over (timed) or not started

        const clickedDot = event.currentTarget.currentTarget.querySelector('.note-dot'); // Use currentTarget twice to get the .fret-cell, then find .note-dot
        const clickedNote = clickedDot.dataset.note;
        const targetNote = NOTES[currentTargetNoteIndex];

        resetFretboardHighlight(); // Clear previous highlights

        clickedDot.style.color = '#fff'; // Show the note name on the clicked fret

        if (clickedNote === targetNote) {
            score += 10;
            feedbackMessage.textContent = 'CORRECT!';
            feedbackMessage.classList.add('correct');
            feedbackMessage.classList.remove('incorrect');
            clickedDot.classList.add('correct-guess');
            setTimeout(nextChallenge, 500); // Short delay for feedback
        } else {
            score -= 5; // Penalty for incorrect guess
            feedbackMessage.textContent = `INCORRECT! THAT'S A ${clickedNote}.`;
            feedbackMessage.classList.add('incorrect');
            feedbackMessage.classList.remove('correct');
            clickedDot.classList.add('incorrect-guess');

            // Show ALL correct notes temporarily by highlighting them
            document.querySelectorAll(`.note-dot[data-note="${targetNote}"]`).forEach(dot => {
                // Ensure we don't accidentally override the incorrect-guess color on the clicked dot
                if (dot !== clickedDot) {
                    dot.style.color = '#fff'; // Reveal correct notes
                    dot.classList.add('active'); // Highlight correct notes
                }
            });

            setTimeout(nextChallenge, 1500); // Longer delay to see error and correct answers
        }
        scoreDisplay.textContent = score;
    }

    // --- Event Listeners ---
    playButton.addEventListener('click', () => {
        showScreen(gameScreen);
        createFretboard(); // Generate fretboard when game screen is shown
        startGame(); // Start game according to current mode
    });

    settingsButton.addEventListener('click', () => {
        showScreen(settingsScreen);
    });

    backButton.addEventListener('click', () => { // Settings screen back button
        showScreen(startScreen);
    });

    backToMainButton.addEventListener('click', () => { // Game screen back button
        resetGame(); // Reset game state before going back to main menu
        showScreen(startScreen);
    });

    // Handle the game's main action button (Start Game / Restart Game)
    gameStartButton.addEventListener('click', () => {
        startGame(); // Calling startGame directly handles both initial start and restart
    });

    // Listen for changes in game mode radio buttons (Timed/Untimed)
    gameModeRadios.forEach(radio => {
        radio.addEventListener('change', (event) => {
            isTimedGame = event.target.value === 'timed';
            const timeSuffix = document.querySelector('.time-suffix');

            // Update display based on selection
            if (isTimedGame) {
                timeDisplayContainer.classList.remove('hidden-time');
                timeDisplay.textContent = timeLeft; // Show current time (resets to 60 for visual context)
                // Control 's' visibility based on screen size
                if (window.innerWidth <= 400) {
                    if (timeSuffix) timeSuffix.style.display = 'none';
                } else {
                    if (timeSuffix) timeSuffix.style.display = 'inline';
                }
            } else {
                timeDisplayContainer.classList.add('hidden-time'); // Hide time display
                if (timeSuffix) timeSuffix.style.display = 'none'; // Ensure 's' is hidden
            }
        });
    });

    // --- Initial setup on page load ---
    showScreen(startScreen); // Show the start screen first
    // Ensure the radio button state matches the initial `isTimedGame` variable
    document.querySelector(`input[name="gameMode"][value="${isTimedGame ? 'timed' : 'untimed'}"]`).checked = true;
    // Set initial visibility of the time display and 's' suffix based on default mode and screen width
    const timeSuffix = document.querySelector('.time-suffix');
    if (timeSuffix) {
        if (!isTimedGame || window.innerWidth <= 400) { // If untimed OR very small screen
            timeSuffix.style.display = 'none';
        } else {
            timeSuffix.style.display = 'inline';
        }
    }
});
