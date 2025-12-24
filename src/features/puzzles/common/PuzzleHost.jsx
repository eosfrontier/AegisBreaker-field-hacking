import { useEffect, useMemo, useRef, useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { motion } from 'motion/react';

import BootSplash from '../../../components/common/BootSplash';
import SequencePuzzle from '../SequencePuzzle';
import FrequencyPuzzle from '../FrequencyPuzzle';
import LogicPuzzle from '../LogicPuzzle';
import MasterLockPuzzle from '../MasterLockPuzzle';
// import ByteStream from '../Puzzle/ByteStream';
// import GridCipher from '../Puzzle/GridCipher';
import SignalShuntPuzzle from '../SignalShuntPuzzle';
import { db } from '../../../lib/firebaseConfig';
import { PUZZLE_COMPONENT_TYPES } from './puzzleRegistry';

const DEFAULT_BOOT_STEPS = [
  { label: 'Establishing secure connection...', ms: 420 },
  { label: 'Identifying attack vector...', ms: 500 },
  { label: 'Decoding encryption...', ms: 520 },
  { label: 'Accessing ICE layer...', ms: 480 },
  { label: 'Channel stable.', ms: 320 },
];

const SOLVE_SEQUENCE_STEPS = [
  { label: 'ICE response nullified', ms: 320 },
  { label: 'Exfiltration tunnel stabilized', ms: 360 },
  { label: 'Uplink authenticated', ms: 420 },
];

const SOLVE_SEQUENCE_TRAILING_MS = 260;
const FEEDBACK_COOLDOWN_MS = 30 * 60 * 1000;
const DEFAULT_COMPLETION_TITLE = 'Access granted';
const DEFAULT_COMPLETION_SUBTITLE = 'ICE layer neutralized. Data channel is stable.';
const PUZZLE_COMPONENTS = {
  sequence: SequencePuzzle,
  frequencyTuning: FrequencyPuzzle,
  logic: LogicPuzzle,
  masterLock: MasterLockPuzzle,
  signalShunt: SignalShuntPuzzle,
};

function SolvedBadge() {
  return (
    <div className="solved-badge">
      <div className="solved-badge-core">{'\u2713'}</div>
      <div className="solved-badge-ring solved-badge-ring--outer" />
      <div className="solved-badge-ring solved-badge-ring--inner" />
      <div className="solved-badge-scan" />
      <div className="solved-badge-particle solved-badge-particle--a" />
      <div className="solved-badge-particle solved-badge-particle--b" />
      <div className="solved-badge-particle solved-badge-particle--c" />
    </div>
  );
}

function SolvedSequenceOverlay({ stepIndex, completionTitle = DEFAULT_COMPLETION_TITLE }) {
  return (
    <div className="main solved-sequence-overlay">
      <div className="solved-sequence-card">
        <div className="solved-sequence-title">{completionTitle}</div>
        <div className="solved-sequence-steps">
          {SOLVE_SEQUENCE_STEPS.map((step, idx) => {
            const state = idx < stepIndex ? 'done' : idx === stepIndex ? 'active' : 'idle';
            return (
              <div key={step.label} className={`solved-sequence-step ${state}`}>
                <span className="bullet" />
                <span className="label">{step.label}</span>
              </div>
            );
          })}
        </div>
        <div className="solved-sequence-progress">
          <span style={{ width: `${((stepIndex + 1) / SOLVE_SEQUENCE_STEPS.length) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

/**
 * Shared puzzle wrapper used by both session-based puzzles and local QuickHack puzzles.
 */
export default function PuzzleHost({
  loading = false,
  puzzleType,
  layerData,
  sessionId,
  layerId,
  bootSteps = DEFAULT_BOOT_STEPS,
  allowBootSkip = true,
  skipBootKey = 'ab:bootSkipOnce',
  completionTitle,
  completionSubtitle,
  onExit,
  onLocalPuzzleComplete,
}) {
  const feedbackKey = useMemo(() => {
    if (sessionId && layerId) return `fb:${sessionId}:${layerId}`;
    const base = puzzleType || 'unknown';
    const diff = layerData?.difficulty ?? 'na';
    return `fb:local:${base}:${diff}`;
  }, [sessionId, layerId, puzzleType, layerData?.difficulty]);

  const characterInfo = useMemo(() => {
    try {
      const raw = localStorage.getItem('characterInfo');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, []);

  const [showBoot, setShowBoot] = useState(() => {
    if (!skipBootKey) return true;
    try {
      const skip = sessionStorage.getItem(skipBootKey) === '1';
      if (skip) sessionStorage.removeItem(skipBootKey);
      return !skip;
    } catch {
      return true;
    }
  });
  const [localSolved, setLocalSolved] = useState(false);
  const [showSolveSequence, setShowSolveSequence] = useState(false);
  const [solveSequenceStep, setSolveSequenceStep] = useState(0);
  const solveSequenceStartedRef = useRef(false);
  const [feedbackRating, setFeedbackRating] = useState(3);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(() => {
    try {
      return localStorage.getItem(`ab:${feedbackKey}:submitted`) === '1';
    } catch {
      return false;
    }
  });
  const [feedbackDeferUntil, setFeedbackDeferUntil] = useState(() => {
    try {
      return Number(localStorage.getItem(`ab:${feedbackKey}:deferUntil`)) || 0;
    } catch {
      return 0;
    }
  });
  const [feedbackError, setFeedbackError] = useState('');
  const [typeFeedbackSubmitted, setTypeFeedbackSubmitted] = useState(() => {
    if (!puzzleType) return false;
    try {
      return localStorage.getItem(`ab:feedback:type:${puzzleType}`) === '1';
    } catch {
      return false;
    }
  });
  const [globalFeedbackCooldownUntil, setGlobalFeedbackCooldownUntil] = useState(() => {
    try {
      return Number(localStorage.getItem('ab:feedback:cooldownUntil')) || 0;
    } catch {
      return 0;
    }
  });

  useEffect(() => {
    if (!puzzleType) {
      setTypeFeedbackSubmitted(false);
      return;
    }
    try {
      setTypeFeedbackSubmitted(localStorage.getItem(`ab:feedback:type:${puzzleType}`) === '1');
    } catch {
      setTypeFeedbackSubmitted(false);
    }
  }, [puzzleType]);

  const handleBootDone = () => setShowBoot(false);

  const handleLocalSolved = () => {
    setLocalSolved(true);
    onLocalPuzzleComplete?.();
  };

  const resolvedCompletionTitle = completionTitle ?? DEFAULT_COMPLETION_TITLE;
  const resolvedCompletionSubtitle = completionSubtitle ?? DEFAULT_COMPLETION_SUBTITLE;

  const isSolved = useMemo(() => localSolved || layerData?.status === 'SOLVED', [localSolved, layerData]);

  const showBootOverlay = loading || showBoot;
  const [puzzleVisible, setPuzzleVisible] = useState(!showBootOverlay);
  const puzzleKey = useMemo(
    () => `${puzzleType || 'unknown'}-${layerId || 'local'}-${sessionId || 'local'}`,
    [puzzleType, layerId, sessionId],
  );

  useEffect(() => {
    if (!showBootOverlay) {
      setPuzzleVisible(true);
    }
  }, [showBootOverlay]);

  useEffect(() => {
    if (!isSolved || solveSequenceStartedRef.current) return undefined;

    solveSequenceStartedRef.current = true;
    setShowSolveSequence(true);
    setSolveSequenceStep(0);

    const timeouts = [];
    let cursorMs = 0;
    SOLVE_SEQUENCE_STEPS.forEach((step, idx) => {
      cursorMs += step.ms;
      timeouts.push(setTimeout(() => setSolveSequenceStep(idx), cursorMs));
    });
    timeouts.push(setTimeout(() => setShowSolveSequence(false), cursorMs + SOLVE_SEQUENCE_TRAILING_MS));

    return () => timeouts.forEach(clearTimeout);
  }, [isSolved]);

  const bootOverlay = (
    <BootSplash show={showBoot || loading} onDone={handleBootDone} steps={bootSteps} allowSkip={allowBootSkip} />
  );

  if (isSolved) {
    const now = Date.now();
    const shouldHideFeedback =
      typeFeedbackSubmitted || globalFeedbackCooldownUntil > now || feedbackSubmitted || feedbackDeferUntil > now;

    const submitFeedback = async () => {
      if (feedbackSubmitting) return;
      setFeedbackSubmitting(true);
      setFeedbackError('');
      try {
        const note = feedbackText.trim();
        const payload = {
          rating: feedbackRating,
          note: note || null,
          sessionId: sessionId || null,
          layerId: layerId || null,
          puzzleType: puzzleType || null,
          difficulty: layerData?.difficulty ?? null,
          layerStatus: layerData?.status ?? null,
          faction: characterInfo?.faction ?? null,
          characterName: characterInfo?.name ?? null,
          characterLevel: characterInfo?.level ?? null,
          characterSkills: characterInfo?.skills ?? null,
          role: characterInfo?.role ?? null,
          clientTs: new Date().toISOString(),
          createdAt: serverTimestamp(),
        };
        await addDoc(collection(db, 'feedback'), payload);
        const cooldownUntil = Date.now() + FEEDBACK_COOLDOWN_MS;
        try {
          localStorage.setItem(`ab:${feedbackKey}:submitted`, '1');
          localStorage.setItem('ab:feedback:cooldownUntil', String(cooldownUntil));
          if (puzzleType) {
            localStorage.setItem(`ab:feedback:type:${puzzleType}`, '1');
          }
        } catch {
          /* ignore */
        }
        if (puzzleType) setTypeFeedbackSubmitted(true);
        setGlobalFeedbackCooldownUntil(cooldownUntil);
        setFeedbackSubmitted(true);
      } catch (err) {
        console.error('Failed to send feedback', err);
        setFeedbackError('Could not send feedback. Please try again.');
      } finally {
        setFeedbackSubmitting(false);
      }
    };

    const remindLater = () => {
      const later = Date.now() + FEEDBACK_COOLDOWN_MS;
      try {
        localStorage.setItem(`ab:${feedbackKey}:deferUntil`, String(later));
      } catch {
        /* ignore */
      }
      setFeedbackDeferUntil(later);
    };

    const solvedBody = (
      <div className="main layer-solved">
        <div className="solved-hero">
          <SolvedBadge />
          <div className="solved-copy">
            <p className="solved-eyebrow">Layer bypassed</p>
            <h3>{resolvedCompletionTitle}</h3>
            <p className="solved-subtitle">{resolvedCompletionSubtitle}</p>
          </div>
        </div>
        {onExit && (
          <button className="qh-btn" onClick={onExit}>
            Close connection
          </button>
        )}
        {!shouldHideFeedback && (
          <div className="feedback-card">
            <div className="feedback-header">
              <span>How was this puzzle?</span>
              <div className="feedback-actions">
                <button className="feedback-link" onClick={remindLater} disabled={feedbackSubmitting}>
                  Remind me later
                </button>
                <button
                  className="feedback-link"
                  onClick={() => {
                    try {
                      localStorage.setItem(`ab:${feedbackKey}:submitted`, '1');
                    } catch {
                      /* ignore */
                    }
                    setFeedbackSubmitted(true);
                  }}
                  disabled={feedbackSubmitting}
                >
                  Skip
                </button>
              </div>
            </div>
            <div className="feedback-stars" role="radiogroup" aria-label="Rate this puzzle">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  style={{ padding: 0 }}
                  className={`feedback-star ${feedbackRating >= star ? 'active' : ''}`}
                  onClick={() => setFeedbackRating(star)}
                  aria-label={`${star} star${star > 1 ? 's' : ''}`}
                >
                  {feedbackRating >= star ? '★' : '☆'}
                </button>
              ))}
            </div>
            <label className="feedback-label">
              Any further thoughts or feedback?
              <textarea
                className="feedback-textarea"
                rows="3"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="What worked well? What was confusing?"
              />
            </label>
            {feedbackError && <div className="feedback-error">{feedbackError}</div>}
            <button className="qh-btn" onClick={submitFeedback} disabled={feedbackSubmitting}>
              {feedbackSubmitting ? 'Sending…' : 'Send feedback'}
            </button>
          </div>
        )}
        {feedbackSubmitted && <div className="feedback-thanks">Thanks for the intel. Routing to HQ.</div>}
      </div>
    );

    return showSolveSequence ? (
      <SolvedSequenceOverlay stepIndex={solveSequenceStep} completionTitle={resolvedCompletionTitle} />
    ) : (
      solvedBody
    );
  }

  const resolvedPuzzleType = PUZZLE_COMPONENT_TYPES[puzzleType] || puzzleType;
  const PuzzleComponent = resolvedPuzzleType ? PUZZLE_COMPONENTS[resolvedPuzzleType] : null;
  const puzzleProps = {
    sessionId,
    layerId,
    layerData,
    onLocalPuzzleComplete: handleLocalSolved,
  };

  const content = PuzzleComponent ? (
    <PuzzleComponent {...puzzleProps} />
  ) : (
    <div style={{ padding: '1rem' }}>Unknown puzzle type!</div>
  );

  return (
    <div className="main puzzle-host-shell">
      {showBootOverlay && (
        <motion.div
          key="boot"
          className="puzzle-host-content"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.03 }}
          transition={{ duration: 0.28, ease: 'easeInOut' }}
        >
          {bootOverlay}
        </motion.div>
      )}

      <motion.div
        key={puzzleKey}
        className="puzzle-host-content"
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={puzzleVisible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 8, scale: 0.99 }}
        transition={{ duration: 0.32, ease: 'easeOut' }}
      >
        {content}
      </motion.div>
    </div>
  );
}
