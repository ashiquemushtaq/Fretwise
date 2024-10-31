const fretboard = document.querySelector('.fretboard');
const feedbackElement = document.getElementById('feedback');
let correctNote; // Store the correct musical note (with sharp and flat options)
let score = 0; // Initialize score

// Define musical notes in order (using sharps only for simplicity)
const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Base notes for each string (6 to 1)
const stringBaseNotes = {
  6: 'E', // Low E
  5: 'A',
  4: 'D',
  3: 'G',
  2: 'B',
  1: 'E'  // High E
};

// Create a map for enharmonic equivalents
const enharmonicMap = {
  'C#': ['C#', 'D♭'],
  'D#': ['D#', 'E♭'],
  'F#': ['F#', 'G♭'],
  'G#': ['G#', 'A♭'],
  'A#': ['A#', 'B♭']
};

// Initialize fretboard layout without open notes (fret 0)
function createFretboard() {
  fretboard.innerHTML = '';
  for (let string = 6; string >= 1; string--) {
    const stringLabel = document.createElement('div');
    stringLabel.classList.add('string-label');
    stringLabel.textContent = `${stringBaseNotes[string]}`;
    fretboard.appendChild(stringLabel);

    // Start from fret 1 to exclude open notes
    for (let fret = 1; fret <= 12; fret++) {
      const fretDiv = document.createElement('div');
      fretDiv.classList.add('fret');
      fretDiv.dataset.string = string;
      fretDiv.dataset.fret = fret;

      const noteCircle = document.createElement('div');
      noteCircle.classList.add('note-circle');
      fretDiv.appendChild(noteCircle);

      fretboard.appendChild(fretDiv);
    }
  }
}

createFretboard(); // Initialize fretboard display

// Event listener for starting the quiz and resetting game if needed
document.getElementById('start-quiz').addEventListener('click', () => {
  score = 0; // Reset score at the start
  document.getElementById('start-quiz').textContent = 'Play Again';
  feedbackElement.textContent = ''; // Clear feedback on "Play Again"
  feedbackElement.className = ''; // Remove any feedback styling
  document.getElementById('guess-note').value = '';
  startNewRound();
});

// Get selected strings
function getSelectedStrings() {
  const selectedStrings = [];
  for (let i = 1; i <= 6; i++) {
    if (document.getElementById(`string-${i}`).checked) {
      selectedStrings.push(i);
    }
  }
  return selectedStrings;
}

// Start a new round by generating a random note and updating the UI
function startNewRound() {
  const selectedStrings = getSelectedStrings();
  if (selectedStrings.length === 0) {
    feedbackElement.textContent = 'Please select at least one string.';
    return;
  }
  generateRandomNote(selectedStrings);
}

// Generate a random note and store the correct answer in both sharp and flat formats
function generateRandomNote(strings) {
  const randomString = strings[Math.floor(Math.random() * strings.length)];
  const randomFret = Math.floor(Math.random() * 12) + 1; // Now ensures frets 1-12 only

  // Determine the correct musical note in both sharp and flat formats
  correctNote = calculateNoteOnFret(randomString, randomFret);

  // Debugging output to verify the correct note
  console.log(`Generated note on ${stringBaseNotes[randomString]} String, Fret ${randomFret}: ${correctNote.join(' or ')}`);

  // Show the note on the fretboard
  displayNoteOnFretboard(randomString, randomFret);

  // Set feedback for guessing
  feedbackElement.textContent = `Score: ${score} - Guess the musical note on ${stringBaseNotes[randomString]} String, Fret ${randomFret}. Type your answer below.`;
}

// Calculate the note on a specific string and fret and provide both sharp and flat equivalents
function calculateNoteOnFret(string, fret) {
  const baseNote = stringBaseNotes[string];
  const baseIndex = notes.indexOf(baseNote);
  const noteIndex = (baseIndex + fret) % notes.length;
  const note = notes[noteIndex];

  // Return an array with the note in both sharp and flat forms, if applicable
  return enharmonicMap[note] ? enharmonicMap[note] : [note];
}

// Display the note on the fretboard
function displayNoteOnFretboard(string, fret) {
  document.querySelectorAll('.note-circle').forEach(note => note.style.display = 'none');
  const noteCircle = document.querySelector(`.fret[data-string="${string}"][data-fret="${fret}"] .note-circle`);
  noteCircle.style.display = 'block';
}

// Event listener for submitting the guess
document.getElementById('submit-guess').addEventListener('click', () => {
  const guessedNote = document.getElementById('guess-note').value.trim().toUpperCase();
  
  if (guessedNote) {
    // Check if the guessed note matches any form of the correct note (sharp or flat)
    if (correctNote.includes(guessedNote)) {
      score++; // Increase score on correct answer
      feedbackElement.textContent = `Correct! Score: ${score}. Well done! Starting next round...`;
      feedbackElement.className = 'correct';
      setTimeout(startNewRound, 1000); // Automatically start a new round after a short delay
      document.getElementById('guess-note').value = '';
    } else {
      feedbackElement.textContent = `Incorrect. The correct answer was ${correctNote.join(' or ')}. Your score was: ${score}. Click "Play Again" to try from scratch.`;
      feedbackElement.className = 'incorrect';
      score = 0; // Reset score on incorrect answer
      document.getElementById('start-quiz').textContent = 'Play Again';
    }
  } else {
    feedbackElement.textContent = 'Please enter a musical note to submit your guess.';
    feedbackElement.className = ''; // Clear class for neutral feedback
  }
});
