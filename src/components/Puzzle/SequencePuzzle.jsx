import { useState, useEffect } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import "./SequencePuzzle.css";

const VALID_CHARS = [
  '!', '"', '#', '$', '%', '&', "'", '(', ')', '*', '+', ',', '-', '.', '/',
  '0','1','2','3','4','5','6','7','8','9',
  ':',';','<','=', '>','?','@',
  'A','B','C','D','E','F','G','H','I','J','K','L','M',
  'N','O','P','Q','R','S','T','U','V','W','X','Y','Z',
  '[','\\',']','^','_','`',
  'a','b','c','d','e','f','g','h','i','j','k','l','m',
  'n','o','p','q','r','s','t','u','v','w','x','y','z',
  '{','|','}','~',
  'Ä','Å','Ç','É','Ñ','Ö','Ü',
  'á','à','â','ä','ã','å','ç','é','è','ê','ë','í','ì','î','ï','ñ',
  'ó','ò','ô','ö','õ','ú','ù','û','ü',
  '°','¢','£','§','•','¶','ß','®','©','™','ª','º','æ','¡','’',
  '÷','ÿ','Ÿ','¤','‹','›','·','‚','„','Â','Ê',
  'Á','Ë','È','Í','Î','Ï','Ì','Ó','Ô','Ò','Ú','Û','Ù','ˆ',
  'Þ'
];

/**
 * Generate a random sequence of length `len` from VALID_CHARS
 */
const generateRandomSequence = (len) => {
  const sequence = [];
  for (let i = 0; i < len; i++) {
    const randomIndex = Math.floor(Math.random() * VALID_CHARS.length);
    sequence.push(VALID_CHARS[randomIndex]);
  }
  return sequence;
};

const SequencePuzzle = ({ sessionId, layerId, layerData }) => {
  // 1) On mount, generate a brand new 5-symbol sequence
  const [sequence, setSequence] = useState([]);
  // 2) Current index in the sequence
  const [progressIndex, setProgressIndex] = useState(0);
  // 3) Current set of shuffled choices (correct symbol + random others)
  const [currentChoices, setCurrentChoices] = useState([]);

  const difficulty = layerData?.difficulty || 1;


  useEffect(() => {
    // Generate the random 5-symbol sequence once
    const newSequence = generateRandomSequence(5 * difficulty);
    setSequence(newSequence);
  }, [difficulty]);

  /**
   * Whenever the `progressIndex` or the `sequence` changes,
   * generate a new set of choices if we're not at the end.
   */
  useEffect(() => {
    if (sequence.length === 0) return;         // Not ready yet
    if (progressIndex >= sequence.length) return; // Already complete

    const correctChar = sequence[progressIndex];
    setCurrentChoices(generateShuffledChoices(correctChar));
  }, [progressIndex, sequence]);

  /**
   * Generate random 7 other chars + the correct one, then shuffle
   */
  const generateShuffledChoices = (correctChar) => {
    let randomChars = [];
    // pick 7 distinct random chars (not the correct one)
    while (randomChars.length < 9 * difficulty) {
      const candidate = VALID_CHARS[Math.floor(Math.random() * VALID_CHARS.length)];
      if (!randomChars.includes(candidate) && candidate !== correctChar) {
        randomChars.push(candidate);
      }
    }

    // Insert correct char at random position
    const correctPos = Math.floor(Math.random() * 8);
    randomChars.splice(correctPos, 0, correctChar);
    return randomChars;
  };

  /**
   * Handle when the user taps a choice
   */
  const handleChoiceClick = async (char) => {
    if (sequence.length === 0) return; // safety check

    const correctChar = sequence[progressIndex];
    if (char === correctChar) {
      // Correct choice
      const nextIndex = progressIndex + 1;
      setProgressIndex(nextIndex);

      if (nextIndex === sequence.length) {
        // Puzzle is solved
        try {
          const layerRef = doc(db, "sessions", sessionId, "layers", layerId);
          await updateDoc(layerRef, { status: "SOLVED" });
        } catch (err) {
          console.error("Error updating puzzle status:", err);
        }
      }
    } else {
      // Wrong choice (optional: show an error animation, reduce time, etc.)
      console.log("Wrong choice!");
    }
  };

  // If fully solved, just show a success message
  if (progressIndex === sequence.length && sequence.length > 0) {
    return <div className="sequence-puzzle-container">Sequence complete! Good job!</div>;
  }

  // The next symbol to tap (for reference or if you want to display it)
  const currentTarget = sequence[progressIndex] || "";

  return (
    <div className="sequence-puzzle-container">
      <h2>Sequence Puzzle</h2>


      {/* Progress row: e.g. 5 boxes for a 5-symbol sequence */}
      <div className="progress-row">
        {sequence.map((symbol, idx) => (
          <div
            key={idx}
            className={idx < progressIndex ? "progress-box filled" : "progress-box"}
          />
        ))}
      </div>
      <p>
        {`Completed ${progressIndex} / ${sequence.length}`}
      </p>

      {/* The current symbol to tap, displayed with the custom font */}
      <div className="current-target">
        <span className="digital-symbol">{currentTarget}</span>
      </div>

      {/* The choice buttons */}
      <div className="choices-row">
        {currentChoices.map((char, idx) => (
          <button
            key={idx}
            className="puzzle-button"
            onClick={() => handleChoiceClick(char)}
          >
            <span className="digital-symbol">{char}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SequencePuzzle;