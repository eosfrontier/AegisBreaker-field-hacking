import { useState, useEffect, useCallback } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebaseConfig';
import { useScriptContext } from '../scripts/ScriptProvider';
import './styles/SequencePuzzle.css';

const VALID_CHARS = [
  '!',
  '"',
  '#',
  '$',
  '%',
  '&',
  "'",
  '(',
  ')',
  '*',
  '+',
  ',',
  '-',
  '.',
  '/',
  '0',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  ':',
  ';',
  '<',
  '=',
  '>',
  '?',
  '@',
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
  'P',
  'Q',
  'R',
  'S',
  'T',
  'U',
  'V',
  'W',
  'X',
  'Y',
  'Z',
  '[',
  '\\',
  ']',
  '^',
  '_',
  'a',
  'b',
  'c',
  'd',
  'f',
  'g',
  'h',
  'i',
  'j',
  'k',
  'l',
  'm',
  'n',
  'o',
  'p',
  'q',
  'r',
  's',
  't',
  'u',
  'v',
  'w',
  'x',
  'y',
  'z',
  '{',
  '|',
  '}',
  '~',
];

const generateRandomSequence = (len) => {
  const sequence = [];
  for (let i = 0; i < len; i++) {
    const randomIndex = Math.floor(Math.random() * VALID_CHARS.length);
    sequence.push(VALID_CHARS[randomIndex]);
  }
  return sequence;
};

const SequencePuzzle = ({ sessionId, layerId, layerData, onLocalPuzzleComplete }) => {
  const [effectiveDifficulty, setEffectiveDifficulty] = useState(Number(layerData?.difficulty || 1));
  const [sequence, setSequence] = useState([]);
  const [progressIndex, setProgressIndex] = useState(0);
  const [currentChoices, setCurrentChoices] = useState([]);
  const [hintActive, setHintActive] = useState(false);
  const [narrowBandSteps, setNarrowBandSteps] = useState(0);
  const [mistakesUsed, setMistakesUsed] = useState(0);

  const { setScriptContext } = useScriptContext();

  const difficulty = Number(effectiveDifficulty || 1);
  const allowedMistakes = Math.max(0, difficulty - 1);

  const generateShuffledChoices = useCallback(
    (correctChar) => {
      let randomChars = [];
      const baseChoices = 9 * difficulty;
      const totalChoices = narrowBandSteps > 0 ? Math.max(3, Math.ceil(baseChoices / 2)) : baseChoices;
      while (randomChars.length < totalChoices - 1) {
        const candidate = VALID_CHARS[Math.floor(Math.random() * VALID_CHARS.length)];
        if (!randomChars.includes(candidate) && candidate !== correctChar) {
          randomChars.push(candidate);
        }
      }
      const correctPos = Math.floor(Math.random() * totalChoices);
      randomChars.splice(correctPos, 0, correctChar);
      return randomChars;
    },
    [difficulty, narrowBandSteps],
  );

  useEffect(() => {
    const newSequence = generateRandomSequence(5 * difficulty);
    setSequence(newSequence);
    setProgressIndex(0);
    setMistakesUsed(0);
  }, [difficulty]);

  useEffect(() => {
    if (sequence.length === 0) return;
    if (progressIndex >= sequence.length) return;
    const correctChar = sequence[progressIndex];
    setCurrentChoices(generateShuffledChoices(correctChar));
  }, [generateShuffledChoices, narrowBandSteps, progressIndex, sequence]); // re-render choices when band toggles

  useEffect(() => {
    if (sequence.length === 0) return;
    if (progressIndex >= sequence.length) return;
    const correctChar = sequence[progressIndex];
    setCurrentChoices(generateShuffledChoices(correctChar));
  }, [progressIndex, sequence, generateShuffledChoices, narrowBandSteps]);

  const handleChoiceClick = async (char) => {
    if (sequence.length === 0) return;

    const correctChar = sequence[progressIndex];
    if (char === correctChar) {
      const nextIndex = progressIndex + 1;
      setProgressIndex(nextIndex);
      setNarrowBandSteps((s) => (s > 0 ? s - 1 : 0));

      if (nextIndex === sequence.length) {
        if (sessionId && layerId) {
          try {
            const layerRef = doc(db, 'sessions', sessionId, 'layers', layerId);
            await updateDoc(layerRef, { status: 'SOLVED' });
          } catch (err) {
            console.error('Error updating puzzle status:', err);
          }
        } else if (typeof onLocalPuzzleComplete === 'function') {
          onLocalPuzzleComplete();
        }
      }
    } else {
      const nextMistakes = mistakesUsed + 1;
      if (allowedMistakes === 0 || nextMistakes > allowedMistakes) {
        setProgressIndex(0);
        setMistakesUsed(0);
      } else {
        setMistakesUsed(nextMistakes);
      }
    }
  };

  const revealHint = useCallback(() => {
    if (sequence.length === 0 || progressIndex >= sequence.length) return { ok: false, reason: 'blocked' };
    setHintActive(true);
    setTimeout(() => setHintActive(false), 2000);
    return { ok: true };
  }, [sequence.length, progressIndex]);

  const narrowBand = useCallback(() => {
    setNarrowBandSteps(3);
    return { ok: true };
  }, []);

  const weakenIce = useCallback(() => {
    if (effectiveDifficulty <= 1) return { ok: false, reason: 'min_difficulty' };
    const next = effectiveDifficulty - 1;
    setEffectiveDifficulty(next);
    setProgressIndex(0);
    setMistakesUsed(0);
    return { ok: true };
  }, [effectiveDifficulty]);

  const resetMistakes = useCallback(() => {
    setMistakesUsed(0);
    return { ok: true };
  }, []);

  useEffect(() => {
    setScriptContext({ id: 'sequence', api: { revealHint, narrowBand, weakenIce, resetMistakes } });
    return () => setScriptContext({ id: null, api: {} });
  }, [setScriptContext, revealHint, narrowBand, weakenIce, resetMistakes]);

  const currentTarget = sequence[progressIndex] || '';

  return (
    <div className="puzzle-frame puzzle-sequence puzzle-centered sequence-puzzle">
      <h2 className="puzzle-title">[ Sequencer ]</h2>

      <div className="progress-row">
        {sequence.map((symbol, idx) => (
          <div key={idx} className={idx < progressIndex ? 'progress-box filled' : 'progress-box'} />
        ))}
      </div>
      <div className="progress-row" style={{ marginTop: '6px' }}>
        {Array.from({ length: allowedMistakes }).map((_, idx) => (
          <div key={idx} className={`progress-box mistake-counter ${idx < mistakesUsed ? 'filled mistake' : ''}`} />
        ))}
      </div>
      <p style={{ margin: 0 }}>{`Completed ${progressIndex} / ${sequence.length}`}</p>

      <div className="current-target">
        <span style={{ margin: 0 }} className="digital-symbol">
          {currentTarget}
        </span>
      </div>

      <div className="choices-row">
        {currentChoices.map((char, idx) => (
          <button
            key={idx}
            className="puzzle-button sequence-button"
            onClick={() => handleChoiceClick(char)}
            style={
              hintActive && char === currentTarget ? { boxShadow: '0 0 10px 3px #0ff', borderColor: '#0ff' } : undefined
            }
          >
            <span className="digital-symbol">{char}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SequencePuzzle;
