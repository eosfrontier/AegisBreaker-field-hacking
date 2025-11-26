import { useEffect, useMemo, useState, useCallback } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

import { generatePuzzleEnsuringUnique } from './logic/generator';
import { parseStatement } from './logic/parser';
import { evaluateAST } from './logic/evaluator';
import { getFlag } from '../prefs/prefsStore';
import TutorialModal from './TutorialModal';
import { useScriptContext } from '../common/ScriptProvider';

import './LogicPuzzle.css';

const PREFS_SCOPE = 'logic_sifter';
const TUTORIAL_KEY = 'tutorial_seen_v1';

const LogicPuzzle = ({ sessionId, layerId, layerData, onLocalPuzzleComplete }) => {
  const [effectiveDifficulty, setEffectiveDifficulty] = useState(Number(layerData?.difficulty ?? 3));
  useEffect(() => {
    setEffectiveDifficulty(Number(layerData?.difficulty ?? 3));
  }, [layerData?.difficulty]);

  const [{ processes, rules, solution }, setPuzzle] = useState({ processes: [], rules: null, solution: {} });
  const [guesses, setGuesses] = useState([]);
  const [puzzleSolved, setPuzzleSolved] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [shake, setShake] = useState(false);

  const [contradictions, setContradictions] = useState({});
  const [scanResultBanner, setScanResultBanner] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);

  const { setScriptContext } = useScriptContext();

  useEffect(() => {
    const p = generatePuzzleEnsuringUnique(effectiveDifficulty);
    setPuzzle(p);
    setGuesses(p.processes.map(() => null));
    setContradictions({});
    setErrorMessage('');
    setPuzzleSolved(false);
    setScanResultBanner('');

    if (!getFlag(PREFS_SCOPE, TUTORIAL_KEY)) setShowTutorial(true);
  }, [effectiveDifficulty]);

  useEffect(() => {
    if (!puzzleSolved) return;
    if (sessionId && layerId) {
      const layerRef = doc(db, 'sessions', sessionId, 'layers', layerId);
      updateDoc(layerRef, { status: 'SOLVED' }).catch(console.error);
    } else if (onLocalPuzzleComplete) {
      onLocalPuzzleComplete();
    }
  }, [puzzleSolved, sessionId, layerId, onLocalPuzzleComplete]);

  const handleGuessChange = (index, value) => {
    const next = [...guesses];
    next[index] = value;
    setGuesses(next);
    setContradictions({});
    setScanResultBanner('');
  };

  const handleValidate = () => {
    if (!processes.length) return;
    const allAnswered = guesses.every((g) => g !== null);
    if (!allAnswered) {
      setErrorMessage('Label all modules (Harmless/Security) before validating.');
      setShake(true);
      setTimeout(() => setShake(false), 450);
      return;
    }
    const correct = processes.every((p, i) => guesses[i] === !!solution[p.name]);
    if (correct) {
      setPuzzleSolved(true);
      setErrorMessage('');
    } else {
      setErrorMessage('Incorrect mapping. Re-check the statements and rules.');
      setShake(true);
      setTimeout(() => setShake(false), 450);
    }
  };

  const currentGuessAssignment = useMemo(() => {
    const map = {};
    processes.forEach((p, i) => {
      map[p.name] = guesses[i];
    });
    return map;
  }, [processes, guesses]);

  const performContradictionScan = useCallback(() => {
    let anyKnown = false;
    const result = {};
    let flagged = 0,
      tested = 0;

    for (const proc of processes) {
      const statuses = [];
      for (const text of proc.responses) {
        let status = 'unknown';
        try {
          const ast = parseStatement(text);
          const needed = referencedNames(ast);
          const allKnown =
            needed.every((n) => currentGuessAssignment[n] !== null) && currentGuessAssignment[proc.name] !== null;

          if (allKnown) {
            anyKnown = true;
            const assignment = objectMapTruthy(currentGuessAssignment);
            const truth = evaluateAST(ast, assignment);
            const speakerIsHarmless = assignment[proc.name] === true;
            const isContradiction = (speakerIsHarmless && !truth) || (!speakerIsHarmless && truth);
            status = isContradiction ? 'contradiction' : 'ok';
            tested++;
            if (isContradiction) flagged++;
          } else {
            status = 'unknown';
          }
        } catch {
          status = 'unknown';
        }
        statuses.push(status);
      }
      result[proc.name] = statuses;
    }
    setContradictions(result);

    if (!anyKnown || tested === 0) return { ok: false, reason: 'insufficient_labels' };
    if (flagged === 0) {
      setScanResultBanner(`Scan complete: 0 contradictions out of ${tested} evaluable statements.`);
      return { ok: true };
    }
    setScanResultBanner(`Scan complete: ${flagged} contradiction(s) out of ${tested} evaluable statements.`);
    return { ok: true };
  }, [processes, currentGuessAssignment]);

  const revealClue = useCallback(() => {
    const idx = guesses.findIndex((g) => g === null);
    if (idx === -1) return { ok: false, reason: 'no_unknown' };
    const next = [...guesses];
    const proc = processes[idx];
    const isHarmless = !!solution[proc.name];
    next[idx] = isHarmless;
    setGuesses(next);
    setScanResultBanner(`${proc.name} is ${isHarmless ? 'Harmless' : 'Security'}.`);
    return { ok: true };
  }, [guesses, processes, solution]);

  const weakenIce = useCallback(() => {
    if (effectiveDifficulty <= 1) return { ok: false, reason: 'min_difficulty' };
    const nextDifficulty = effectiveDifficulty - 1;
    setEffectiveDifficulty(nextDifficulty);
    setScanResultBanner(`ICE weakened. Puzzle reset at difficulty ${nextDifficulty}.`);
    return { ok: true };
  }, [effectiveDifficulty]);

  useEffect(() => {
    setScriptContext({
      id: 'logic',
      api: {
        revealContradictions: () => performContradictionScan(),
        revealClue: () => revealClue(),
        weakenIce: () => weakenIce(),
      },
    });
    return () => setScriptContext({ id: null, api: {} });
  }, [setScriptContext, performContradictionScan, revealClue, weakenIce]);

  const allChosen = guesses.every((g) => g !== null);

  return (
    <div className={`logic-puzzle ${shake ? 'error-shake' : ''}`}>
      {showTutorial && (
        <TutorialModal
          isOpen={showTutorial}
          onClose={() => setShowTutorial(false)}
          title="Logic Sifter — Quick Briefing"
          intro={
            <>
              Identify which modules are <strong>Harmless</strong> and which are <strong>Security</strong>.
            </>
          }
          bullets={['Harmless modules always tell the truth.', 'Security modules always lie.']}
          scope={PREFS_SCOPE}
          dontShowAgainKey={TUTORIAL_KEY}
        />
      )}

      <h2>Logic Sifter (Difficulty {effectiveDifficulty})</h2>

      {rules?.exactSecurity != null && (
        <div className="clues">
          <strong>Subsystem Rules:</strong> Exactly {rules.exactSecurity} module(s) are{' '}
          <span style={{ color: '#ff4655' }}>Security</span>.
        </div>
      )}
      {rules?.minSecurity != null && (
        <div className="clues">
          <strong>Subsystem Rules:</strong> At least {rules.minSecurity} module(s) are{' '}
          <span style={{ color: '#ff4655' }}>Security</span>.
        </div>
      )}

      {scanResultBanner && (
        <p className="feedback" style={{ textAlign: 'left' }}>
          {scanResultBanner}
        </p>
      )}

      {processes.map((proc, index) => (
        <div key={proc.name} className="process-card">
          <h3 className="process-title">{proc.name}</h3>

          {proc.responses.map((resp, idx) => {
            const st = contradictions[proc.name]?.[idx] ?? null;
            const cls = st === 'contradiction' ? 'statement contradiction' : st === 'ok' ? 'statement ok' : 'statement';
            return (
              <p key={idx} className={cls}>
                “{resp}”
              </p>
            );
          })}

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
              Security
            </button>
          </div>
        </div>
      ))}

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr' }}>
        <button className="validate-button" onClick={handleValidate} disabled={!allChosen}>
          Validate Identities
        </button>
      </div>

      {errorMessage && <p className="feedback">{errorMessage}</p>}
    </div>
  );
};

export default LogicPuzzle;

/** Helpers */
function objectMapTruthy(obj) {
  const out = {};
  Object.keys(obj).forEach((k) => {
    if (obj[k] !== null) out[k] = obj[k];
  });
  return out;
}
function referencedNames(ast) {
  switch (ast.type) {
    case 'direct':
      return [ast.subject];
    case 'conditional':
      return [ast.subject, ast.conclusion];
    case 'comparison':
      return [...ast.subjects];
    case 'groupComparison':
      return [...ast.subjects];
    default:
      return [];
  }
}
