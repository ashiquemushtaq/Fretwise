document.addEventListener('DOMContentLoaded', () => {
    const fretboardContainer = document.getElementById('fretboard-container');
    const scoreDisplay = document.getElementById('score');
    const timeDisplay = document.getElementById('time');
    const timeDisplayContainer = timeDisplay.parentNode;
    const targetNoteDisplay = document.getElementById('target-note');
    const feedbackMessage = document.getElementById('feedback');
    const gameStartButton = document.getElementById('start-button');
    const playButton = document.getElementById('play-button');
    const settingsButton = document.getElementById('settings-button');
    const backButton = document.getElementById('back-button'); // Settings screen back button
    const backToMainButton = document.getElementById('back-to-main-button'); // Game screen back button
    const gameModeRadios = document.querySelectorAll('input[name="gameMode"]');
    const fretRangeRadios = document.querySelectorAll('input[name="fretRange"]');
    const stringsCheckboxes = document.querySelectorAll('input[name="strings"]');
    const noteTypesRadios = document.querySelectorAll('input[name="noteTypes"]'); // NEW: Note Type Radios
    const backgroundMusic = document.getElementById('background-music');

    const startScreen = document.getElementById('start-screen');
    const settingsScreen = document.getElementById('settings-screen');
    const gameScreen = document.getElementById('game-screen');

    const ALL_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']; // Renamed for clarity
    const NATURAL_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B']; // NEW: Array for natural notes
    const TUNING = ['E', 'A', 'D', 'G', 'B', 'E']; // Standard EADGBe tuning (Low E is index 0, High E is index 5)
    const NUM_FRETS_DISPLAYED = 12;

    let score = 0;
    let timeLeft = 60;
    let gameInterval;
    let currentTargetNoteIndex;

    let isTimedGame = true;
    let selectedFretRange = { min: 1, max: 5 };
    let selectedStrings = [0, 1, 2, 3, 4, 5];
    let selectedNoteType = 'all'; // NEW: Default to 'all' notes

    // --- Screen Management Functions ---
    function showScreen(screenElement) {
        startScreen.classList.remove('active');
        settingsScreen.classList.remove('active');
        gameScreen.classList.remove('active');

        screenElement.classList.add('active');

        if (screenElement === gameScreen) {
            if (backgroundMusic.paused) {
                backgroundMusic.play().catch(e => console.log("Music autoplay prevented:", e));
            }
        } else {
            if (!backgroundMusic.paused) {
                backgroundMusic.pause();
                backgroundMusic.currentTime = 0;
            }
        }
    }

    // --- Game Logic Functions ---
    function getNoteName(stringIndex, fretNumber) {
        const openStringNoteIndex = ALL_NOTES.indexOf(TUNING[stringIndex]); // Use ALL_NOTES here for full calculation
        if (openStringNoteIndex === -1) {
            console.error("Invalid tuning note:", TUNING[stringIndex]);
            return null;
        }
        const noteIndex = (openStringNoteIndex + fretNumber) % 12;
        return ALL_NOTES[noteIndex]; // Always return from ALL_NOTES for internal consistency
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

                fretCellDiv.style.gridRow = TUNING.length - s; // Mirror strings
                fretCellDiv.style.gridColumn = f;

                const noteDot = document.createElement('div');
                noteDot.classList.add('note-dot');
                noteDot.dataset.note = getNoteName(s, f);
                fretCellDiv.appendChild(noteDot);

                fretCellDiv.addEventListener('click', handleFretClick);
                fretboardContainer.appendChild(fretCellDiv);
            }
        }
        updateFretboardVisuals();
    }

    function updateFretboardVisuals() {
        document.querySelectorAll('.fret-cell').forEach(cell => {
            const stringIndex = parseInt(cell.dataset.string);
            const fretNumber = parseInt(cell.dataset.fret);
            const noteName = cell.querySelector('.note-dot').dataset.note;

            const isFretInSelection = fretNumber >= selectedFretRange.min && fretNumber <= selectedFretRange.max;
            const isStringInSelection = selectedStrings.includes(stringIndex);
            // NEW: Check if note type is allowed
            const isNoteTypeAllowed = selectedNoteType === 'all' || NATURAL_NOTES.includes(noteName);

            if (isFretInSelection && isStringInSelection && isNoteTypeAllowed) { // All conditions must be true
                cell.classList.remove('disabled-fret');
                cell.style.pointerEvents = 'auto';
            } else {
                cell.classList.add('disabled-fret');
                cell.style.pointerEvents = 'none';
            }
        });
    }

    function startGame() {
        if (gameInterval) {
            clearInterval(gameInterval);
            gameInterval = null;
        }

        score = 0;
        timeLeft = 60;
        scoreDisplay.textContent = score;

        const timeSuffix = document.querySelector('.time-suffix');

        if (isTimedGame) {
            timeDisplayContainer.classList.remove('hidden-time');
            timeDisplay.textContent = timeLeft;
            if (window.innerWidth <= 400) {
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
            timeDisplayContainer.classList.add('hidden-time');
            if (timeSuffix) timeSuffix.style.display = 'none';
        }

        feedbackMessage.textContent = '';
        gameStartButton.disabled = false;
        gameStartButton.textContent = 'RESTART GAME';

        resetFretboardHighlight();
        nextChallenge();
        updateFretboardVisuals(); // Ensure visuals are set correctly at game start
    }

    function endGame() {
        clearInterval(gameInterval);
        gameInterval = null;
        targetNoteDisplay.textContent = '_';
        feedbackMessage.textContent = `GAME OVER! YOUR SCORE: ${score}`;
        gameStartButton.disabled = false;
        gameStartButton.textContent = 'START GAME';
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
        gameStartButton.disabled = false;
        gameStartButton.textContent = 'START GAME';
        resetFretboardHighlight();
        timeDisplayContainer.classList.remove('hidden-time');
        const timeSuffix = document.querySelector('.time-suffix');
        if (timeSuffix) timeSuffix.style.display = 'inline';
        updateFretboardVisuals();
    }

    // NEW: Modified nextChallenge to respect note type selection
    function nextChallenge() {
        const possibleNotesForChallenge = selectedNoteType === 'all' ? ALL_NOTES : NATURAL_NOTES;

        const availableChallenges = [];

        // Populate available challenges based on selected strings, frets, AND note types
        for (const stringIdx of selectedStrings) {
            for (let fretNum = selectedFretRange.min; fretNum <= selectedFretRange.max; fretNum++) {
                const noteOnFret = getNoteName(stringIdx, fretNum);
                if (possibleNotesForChallenge.includes(noteOnFret)) { // Only add if note type is allowed
                    availableChallenges.push({
                        string: stringIdx,
                        fret: fretNum,
                        note: noteOnFret
                    });
                }
            }
        }

        if (availableChallenges.length === 0) {
            targetNoteDisplay.textContent = 'N/A';
            feedbackMessage.textContent = 'Adjust settings: No notes available!';
            return;
        }

        const randomChallenge = availableChallenges[Math.floor(Math.random() * availableChallenges.length)];

        currentTargetNoteIndex = ALL_NOTES.indexOf(randomChallenge.note); // Always use ALL_NOTES to get index
        targetNoteDisplay.textContent = randomChallenge.note;

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

        if (event.currentTarget.classList.contains('disabled-fret')) {
            return;
        }

        const clickedDot = event.currentTarget.querySelector('.note-dot');
        const clickedNote = clickedDot.dataset.note;
        const targetNote = ALL_NOTES[currentTargetNoteIndex]; // Compare against the note from ALL_NOTES

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
                const dotFretNumber = parseInt(dot.parentNode.dataset.fret);
                const dotStringIndex = parseInt(dot.parentNode.dataset.string);
                const dotNoteName = dot.dataset.note; // Get the note name of this potential correct dot

                // Highlight correct notes ONLY if they are within selected range AND allowed note type
                const isFretInSelection = dotFretNumber >= selectedFretRange.min && dotFretNumber <= selectedFretRange.max;
                const isStringInSelection = selectedStrings.includes(dotStringIndex);
                const isNoteTypeAllowed = selectedNoteType === 'all' || NATURAL_NOTES.includes(dotNoteName);

                if (dot !== clickedDot && isFretInSelection && isStringInSelection && isNoteTypeAllowed) {
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
        startGame();
    });

    settingsButton.addEventListener('click', () => {
        showScreen(settingsScreen);
    });

    backButton.addEventListener('click', () => { // Settings screen back button
        showScreen(startScreen);
        updateFretboardVisuals(); // Re-apply visual settings when returning from settings
    });

    backToMainButton.addEventListener('click', () => { // Game screen back button
        resetGame();
        showScreen(startScreen);
        updateFretboardVisuals(); // Ensure visuals are correct when returning to main menu
    });

    gameStartButton.addEventListener('click', () => {
        startGame();
    });

    gameModeRadios.forEach(radio => {
        radio.addEventListener('change', (event) => {
            isTimedGame = event.target.value === 'timed';
            const timeSuffix = document.querySelector('.time-suffix');

            if (isTimedGame) {
                timeDisplayContainer.classList.remove('hidden-time');
                timeDisplay.textContent = timeLeft;
                if (window.innerWidth <= 400) {
                    if (timeSuffix) timeSuffix.style.display = 'none';
                } else {
                    if (timeSuffix) timeSuffix.style.display = 'inline';
                }
            } else {
                timeDisplayContainer.classList.add('hidden-time');
                if (timeSuffix) timeSuffix.style.display = 'none';
            }
        });
    });

    fretRangeRadios.forEach(radio => {
        radio.addEventListener('change', (event) => {
            const range = event.target.value.split('-').map(Number);
            selectedFretRange = { min: range[0], max: range[1] };
            updateFretboardVisuals();
        });
    });

    stringsCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            selectedStrings = [];
            stringsCheckboxes.forEach((cb, index) => {
                if (cb.checked) {
                    selectedStrings.push(index);
                }
            });
            updateFretboardVisuals();
        });
    });

    // NEW: Event listener for Note Types Radios
    noteTypesRadios.forEach(radio => {
        radio.addEventListener('change', (event) => {
            selectedNoteType = event.target.value; // 'all' or 'naturals'
            updateFretboardVisuals(); // Update visuals based on note type
        });
    });


    // --- Initial setup on page load ---
    showScreen(startScreen);

    // Initialize all settings from their default checked values in HTML
    document.querySelector(`input[name="gameMode"][value="${isTimedGame ? 'timed' : 'untimed'}"]`).checked = true;
    if (!isTimedGame) {
        timeDisplayContainer.classList.add('hidden-time');
    }

    const initialFretRange = document.querySelector('input[name="fretRange"]:checked').value.split('-').map(Number);
    selectedFretRange = { min: initialFretRange[0], max: initialFretRange[1] };

    selectedStrings = [];
    stringsCheckboxes.forEach((cb, index) => {
        if (cb.checked) {
            selectedStrings.push(index);
        }
    });

    selectedNoteType = document.querySelector('input[name="noteTypes"]:checked').value; // Initialize note type
});document.addEventListener('DOMContentLoaded', () => {
    const fretboardContainer = document.getElementById('fretboard-container');
    const scoreDisplay = document.getElementById('score');
    const timeDisplay = document.getElementById('time');
    const timeDisplayContainer = timeDisplay.parentNode;
    const targetNoteDisplay = document.getElementById('target-note');
    const feedbackMessage = document.getElementById('feedback');
    const gameStartButton = document.getElementById('start-button');
    const playButton = document.getElementById('play-button');
    const settingsButton = document.getElementById('settings-button');
    const backButton = document.getElementById('back-button'); // Settings screen back button
    const backToMainButton = document.getElementById('back-to-main-button'); // Game screen back button
    const gameModeRadios = document.querySelectorAll('input[name="gameMode"]');
    const fretRangeRadios = document.querySelectorAll('input[name="fretRange"]');
    const stringsCheckboxes = document.querySelectorAll('input[name="strings"]');
    const noteTypesRadios = document.querySelectorAll('input[name="noteTypes"]'); // NEW: Note Type Radios
    const backgroundMusic = document.getElementById('background-music');

    const startScreen = document.getElementById('start-screen');
    const settingsScreen = document.getElementById('settings-screen');
    const gameScreen = document.getElementById('game-screen');

    const ALL_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']; // Renamed for clarity
    const NATURAL_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B']; // NEW: Array for natural notes
    const TUNING = ['E', 'A', 'D', 'G', 'B', 'E']; // Standard EADGBe tuning (Low E is index 0, High E is index 5)
    const NUM_FRETS_DISPLAYED = 12;

    let score = 0;
    let timeLeft = 60;
    let gameInterval;
    let currentTargetNoteIndex;

    let isTimedGame = true;
    let selectedFretRange = { min: 1, max: 5 };
    let selectedStrings = [0, 1, 2, 3, 4, 5];
    let selectedNoteType = 'all'; // NEW: Default to 'all' notes

    // --- Screen Management Functions ---
    function showScreen(screenElement) {
        startScreen.classList.remove('active');
        settingsScreen.classList.remove('active');
        gameScreen.classList.remove('active');

        screenElement.classList.add('active');

        if (screenElement === gameScreen) {
            if (backgroundMusic.paused) {
                backgroundMusic.play().catch(e => console.log("Music autoplay prevented:", e));
            }
        } else {
            if (!backgroundMusic.paused) {
                backgroundMusic.pause();
                backgroundMusic.currentTime = 0;
            }
        }
    }

    // --- Game Logic Functions ---
    function getNoteName(stringIndex, fretNumber) {
        const openStringNoteIndex = ALL_NOTES.indexOf(TUNING[stringIndex]); // Use ALL_NOTES here for full calculation
        if (openStringNoteIndex === -1) {
            console.error("Invalid tuning note:", TUNING[stringIndex]);
            return null;
        }
        const noteIndex = (openStringNoteIndex + fretNumber) % 12;
        return ALL_NOTES[noteIndex]; // Always return from ALL_NOTES for internal consistency
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

                fretCellDiv.style.gridRow = TUNING.length - s; // Mirror strings
                fretCellDiv.style.gridColumn = f;

                const noteDot = document.createElement('div');
                noteDot.classList.add('note-dot');
                noteDot.dataset.note = getNoteName(s, f);
                fretCellDiv.appendChild(noteDot);

                fretCellDiv.addEventListener('click', handleFretClick);
                fretboardContainer.appendChild(fretCellDiv);
            }
        }
        updateFretboardVisuals();
    }

    function updateFretboardVisuals() {
        document.querySelectorAll('.fret-cell').forEach(cell => {
            const stringIndex = parseInt(cell.dataset.string);
            const fretNumber = parseInt(cell.dataset.fret);
            const noteName = cell.querySelector('.note-dot').dataset.note;

            const isFretInSelection = fretNumber >= selectedFretRange.min && fretNumber <= selectedFretRange.max;
            const isStringInSelection = selectedStrings.includes(stringIndex);
            // NEW: Check if note type is allowed
            const isNoteTypeAllowed = selectedNoteType === 'all' || NATURAL_NOTES.includes(noteName);

            if (isFretInSelection && isStringInSelection && isNoteTypeAllowed) { // All conditions must be true
                cell.classList.remove('disabled-fret');
                cell.style.pointerEvents = 'auto';
            } else {
                cell.classList.add('disabled-fret');
                cell.style.pointerEvents = 'none';
            }
        });
    }

    function startGame() {
        if (gameInterval) {
            clearInterval(gameInterval);
            gameInterval = null;
        }

        score = 0;
        timeLeft = 60;
        scoreDisplay.textContent = score;

        const timeSuffix = document.querySelector('.time-suffix');

        if (isTimedGame) {
            timeDisplayContainer.classList.remove('hidden-time');
            timeDisplay.textContent = timeLeft;
            if (window.innerWidth <= 400) {
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
            timeDisplayContainer.classList.add('hidden-time');
            if (timeSuffix) timeSuffix.style.display = 'none';
        }

        feedbackMessage.textContent = '';
        gameStartButton.disabled = false;
        gameStartButton.textContent = 'RESTART GAME';

        resetFretboardHighlight();
        nextChallenge();
        updateFretboardVisuals(); // Ensure visuals are set correctly at game start
    }

    function endGame() {
        clearInterval(gameInterval);
        gameInterval = null;
        targetNoteDisplay.textContent = '_';
        feedbackMessage.textContent = `GAME OVER! YOUR SCORE: ${score}`;
        gameStartButton.disabled = false;
        gameStartButton.textContent = 'START GAME';
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
        gameStartButton.disabled = false;
        gameStartButton.textContent = 'START GAME';
        resetFretboardHighlight();
        timeDisplayContainer.classList.remove('hidden-time');
        const timeSuffix = document.querySelector('.time-suffix');
        if (timeSuffix) timeSuffix.style.display = 'inline';
        updateFretboardVisuals();
    }

    // NEW: Modified nextChallenge to respect note type selection
    function nextChallenge() {
        const possibleNotesForChallenge = selectedNoteType === 'all' ? ALL_NOTES : NATURAL_NOTES;

        const availableChallenges = [];

        // Populate available challenges based on selected strings, frets, AND note types
        for (const stringIdx of selectedStrings) {
            for (let fretNum = selectedFretRange.min; fretNum <= selectedFretRange.max; fretNum++) {
                const noteOnFret = getNoteName(stringIdx, fretNum);
                if (possibleNotesForChallenge.includes(noteOnFret)) { // Only add if note type is allowed
                    availableChallenges.push({
                        string: stringIdx,
                        fret: fretNum,
                        note: noteOnFret
                    });
                }
            }
        }

        if (availableChallenges.length === 0) {
            targetNoteDisplay.textContent = 'N/A';
            feedbackMessage.textContent = 'Adjust settings: No notes available!';
            return;
        }

        const randomChallenge = availableChallenges[Math.floor(Math.random() * availableChallenges.length)];

        currentTargetNoteIndex = ALL_NOTES.indexOf(randomChallenge.note); // Always use ALL_NOTES to get index
        targetNoteDisplay.textContent = randomChallenge.note;

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

        if (event.currentTarget.classList.contains('disabled-fret')) {
            return;
        }

        const clickedDot = event.currentTarget.querySelector('.note-dot');
        const clickedNote = clickedDot.dataset.note;
        const targetNote = ALL_NOTES[currentTargetNoteIndex]; // Compare against the note from ALL_NOTES

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
                const dotFretNumber = parseInt(dot.parentNode.dataset.fret);
                const dotStringIndex = parseInt(dot.parentNode.dataset.string);
                const dotNoteName = dot.dataset.note; // Get the note name of this potential correct dot

                // Highlight correct notes ONLY if they are within selected range AND allowed note type
                const isFretInSelection = dotFretNumber >= selectedFretRange.min && dotFretNumber <= selectedFretRange.max;
                const isStringInSelection = selectedStrings.includes(dotStringIndex);
                const isNoteTypeAllowed = selectedNoteType === 'all' || NATURAL_NOTES.includes(dotNoteName);

                if (dot !== clickedDot && isFretInSelection && isStringInSelection && isNoteTypeAllowed) {
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
        startGame();
    });

    settingsButton.addEventListener('click', () => {
        showScreen(settingsScreen);
    });

    backButton.addEventListener('click', () => { // Settings screen back button
        showScreen(startScreen);
        updateFretboardVisuals(); // Re-apply visual settings when returning from settings
    });

    backToMainButton.addEventListener('click', () => { // Game screen back button
        resetGame();
        showScreen(startScreen);
        updateFretboardVisuals(); // Ensure visuals are correct when returning to main menu
    });

    gameStartButton.addEventListener('click', () => {
        startGame();
    });

    gameModeRadios.forEach(radio => {
        radio.addEventListener('change', (event) => {
            isTimedGame = event.target.value === 'timed';
            const timeSuffix = document.querySelector('.time-suffix');

            if (isTimedGame) {
                timeDisplayContainer.classList.remove('hidden-time');
                timeDisplay.textContent = timeLeft;
                if (window.innerWidth <= 400) {
                    if (timeSuffix) timeSuffix.style.display = 'none';
                } else {
                    if (timeSuffix) timeSuffix.style.display = 'inline';
                }
            } else {
                timeDisplayContainer.classList.add('hidden-time');
                if (timeSuffix) timeSuffix.style.display = 'none';
            }
        });
    });

    fretRangeRadios.forEach(radio => {
        radio.addEventListener('change', (event) => {
            const range = event.target.value.split('-').map(Number);
            selectedFretRange = { min: range[0], max: range[1] };
            updateFretboardVisuals();
        });
    });

    stringsCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            selectedStrings = [];
            stringsCheckboxes.forEach((cb, index) => {
                if (cb.checked) {
                    selectedStrings.push(index);
                }
            });
            updateFretboardVisuals();
        });
    });

    // NEW: Event listener for Note Types Radios
    noteTypesRadios.forEach(radio => {
        radio.addEventListener('change', (event) => {
            selectedNoteType = event.target.value; // 'all' or 'naturals'
            updateFretboardVisuals(); // Update visuals based on note type
        });
    });


    // --- Initial setup on page load ---
    showScreen(startScreen);

    // Initialize all settings from their default checked values in HTML
    document.querySelector(`input[name="gameMode"][value="${isTimedGame ? 'timed' : 'untimed'}"]`).checked = true;
    if (!isTimedGame) {
        timeDisplayContainer.classList.add('hidden-time');
    }

    const initialFretRange = document.querySelector('input[name="fretRange"]:checked').value.split('-').map(Number);
    selectedFretRange = { min: initialFretRange[0], max: initialFretRange[1] };

    selectedStrings = [];
    stringsCheckboxes.forEach((cb, index) => {
        if (cb.checked) {
            selectedStrings.push(index);
        }
    });

    selectedNoteType = document.querySelector('input[name="noteTypes"]:checked').value; // Initialize note type
});
