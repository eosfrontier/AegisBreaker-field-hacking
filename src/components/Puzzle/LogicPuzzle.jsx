import { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import generateIntegrityPuzzle from '../../utils/ProcessIntegrityCheck';
import './LogicPuzzle.css';

/**
 * "Trusted & Rogue Processes" puzzle (sci-fi reskin of "Knights & Knaves").
 * Each 'process' is either Trusted (always returns true data) or Rogue (always spoofs false data).
 * The puzzle generates a set of processes and their “responses.” The player must decide each process's role.
 *
 * Props:
 *  - sessionId, layerId (for Firestore usage)
 *  - layerData: { difficulty: number [1..5], ... }
 *  - onLocalPuzzleComplete (called if sessionId/layerId are null)
 */
const ProcessIntegrityCheck = ({ sessionId, layerId, layerData, onLocalPuzzleComplete }) => {
  const difficulty = Number(layerData?.difficulty || 1);
  const [processes, setProcesses] = useState([]);
  const [guesses, setGuesses] = useState([]);
  const [puzzleSolved, setPuzzleSolved] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [shake, setShake] = useState(false);

  // New state variables for reset logic
  const [attemptCount, setAttemptCount] = useState(0);
  const [resetting, setResetting] = useState(false);
  const [resetTimer, setResetTimer] = useState(0);

  // Generate puzzle on mount or when difficulty changes
  useEffect(() => {
    resetPuzzle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [difficulty]);

  // If solved, update Firestore or call local complete
  useEffect(() => {
    if (puzzleSolved) {
      if (sessionId && layerId) {
        // Update Firestore if we have session/layer info
        const layerRef = doc(db, 'sessions', sessionId, 'layers', layerId);
        updateDoc(layerRef, { status: 'SOLVED' }).catch((err) => {
          console.error('Error marking puzzle solved:', err);
        });
      } else if (onLocalPuzzleComplete) {
        // Otherwise, call a local callback
        onLocalPuzzleComplete();
      }
    }
  }, [puzzleSolved, sessionId, layerId, onLocalPuzzleComplete]);

  // Reset the puzzle, attempt count, and any timers
  const resetPuzzle = () => {
    const puzzle = generateIntegrityPuzzle(difficulty);
    setProcesses(puzzle);
    setGuesses(puzzle.map(() => null));
    setAttemptCount(0);
    setErrorMessage('');
    setResetting(false);
    setResetTimer(0);
  };

  const handleGuessChange = (index, value) => {
    if (resetting) return; // Ignore inputs during resetting
    const newGuesses = [...guesses];
    newGuesses[index] = value;
    setGuesses(newGuesses);
  };

  const handleCheckAnswers = () => {
    if (resetting || processes.length === 0) return;

    const allCorrect = processes.every((proc, idx) => guesses[idx] === proc.isTrusted);
    if (allCorrect) {
      setPuzzleSolved(true);
      setErrorMessage('');
    } else {
      // Increase the attempt count
      const newAttemptCount = attemptCount + 1;
      setAttemptCount(newAttemptCount);
      setErrorMessage('One or more selections are incorrect. Please try again.');
      setShake(true);
      setTimeout(() => setShake(false), 500);

      // If we've reached the allowed number of attempts, trigger a reset
      if (newAttemptCount >= difficulty) {
        // Calculate reset duration: 5 seconds * difficulty
        const duration = 5 * difficulty;
        setResetting(true);
        setResetTimer(duration);
        // Start countdown timer
        const interval = setInterval(() => {
          setResetTimer((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              resetPuzzle();
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }
  };

  // Render the spinner and countdown when resetting
  if (resetting) {
    return (
      <div className={`logic-puzzle ${shake ? 'error-shake' : ''}`}>
        <div className="resetting-container">
          <div className="spinner"></div>
          <p className="feedback">
            Security countermeasures activated. Resetting {resetTimer} second{resetTimer !== 1 && 's'}…
          </p>
        </div>
      </div>
    );
  }

  // Otherwise, render the puzzle normally
  return (
    <div className={`logic-puzzle ${shake ? 'error-shake' : ''}`}>
      <h2>Logic Sifter (Difficulty {difficulty})</h2>

      {processes.map((proc, index) => (
        <div key={proc.name} className="process-card">
          <h3 className="process-title">{proc.name}</h3>
          {proc.responses.map((resp, idx) => (
            <p key={idx} className="statement">
              “{resp}”
            </p>
          ))}
          <div className="button-choice-container">
            <button
              className={`choice-button harmless-button ${guesses[index] === true ? 'selected' : ''}`}
              onClick={() => handleGuessChange(index, true)}
            >
              Harmless
            </button>
            <button
              className={`choice-button rogue-button ${guesses[index] === false ? 'selected' : ''}`}
              onClick={() => handleGuessChange(index, false)}
            >
              Hostile
            </button>
          </div>
        </div>
      ))}

      <button className="validate-button" onClick={handleCheckAnswers} disabled={guesses.includes(null)}>
        Validate Identities
      </button>
      {errorMessage && <p className="feedback">{errorMessage}</p>}
    </div>
  );
};

export default ProcessIntegrityCheck;
