import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

import { db } from '../../firebaseConfig';
import './FrequencyPuzzle.css';
import TutorialModal from './TutorialModal';

// Register chart components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

// Utility: random float in [min, max]
function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * FrequencyPuzzle
 *
 * Props:
 * - sessionId (string | null) => if present, Firestore puzzle
 * - layerId (string | null) => if present, Firestore puzzle
 * - layerData (object) => { difficulty, status, ... }
 * - onLocalPuzzleComplete (function | null) => if provided, called when puzzle is solved locally
 */
const FrequencyPuzzle = ({ sessionId, layerId, layerData, onLocalPuzzleComplete }) => {
  const difficulty = Number(layerData?.difficulty ?? 1);
  const TUTORIAL_KEY = 'freq_tutorial_seen_v1';

  // If sessionId/layerId exist, we want to update Firestore. Otherwise, it's local puzzle.
  const isFirestorePuzzle = sessionId && layerId;
  const puzzleDocRef = isFirestorePuzzle ? doc(db, 'sessions', sessionId, 'layers', layerId) : null;

  // --- TARGET WAVES ---
  const [target1, setTarget1] = useState(null);
  const [target2, setTarget2] = useState(null);

  // --- USER WAVES (wave #1) ---
  const [userFreq1, setUserFreq1] = useState(1);
  const [userAmp1, setUserAmp1] = useState(1);
  const [userPhase1, setUserPhase1] = useState(0);
  const [userOffset1, setUserOffset1] = useState(0);

  // --- USER WAVES (wave #2, only for difficulty=5) ---
  const [userFreq2, setUserFreq2] = useState(1);
  const [userAmp2, setUserAmp2] = useState(1);
  const [userPhase2, setUserPhase2] = useState(0);
  const [userOffset2, setUserOffset2] = useState(0);

  const stableMatchTimer = useRef(null);
  const solvedRef = useRef(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [activeWave, setActiveWave] = useState(1);

  useEffect(() => {
    try {
      const seen = localStorage.getItem(TUTORIAL_KEY);
      if (!seen) setShowTutorial(true);
    } catch (e) {
      console.warn('Tutorial storage unavailable', e);
    }
  }, []);

  // Generate wave parameters once, or only if difficulty changes and we haven't generated yet
  useEffect(() => {
    if (!target1) {
      // Create target wave #1
      const t1 = generateWaveParams(difficulty);
      let t2 = null;

      // For difficulty=5, generate second wave
      if (difficulty === 5) {
        t2 = generateWaveParams(difficulty);

        // Optionally ensure wave2 freq != wave1 freq to avoid perfect overlap
        while (Math.abs(t2.freq - t1.freq) < 0.5) {
          t2 = generateWaveParams(difficulty);
        }
      }

      setTarget1(t1);
      setTarget2(t2);

      // Randomize user wave #1
      setUserFreq1(getRandomFloat(2, 5));
      setUserAmp1(difficulty >= 2 ? getRandomFloat(0.8, 2) : 1);
      setUserPhase1(difficulty >= 3 ? getRandomFloat(-Math.PI, Math.PI) : 0);
      setUserOffset1(difficulty === 4 ? getRandomFloat(-1, 1) : 0);

      // If difficulty=5, randomize user wave #2
      if (difficulty === 5) {
        setUserFreq2(getRandomFloat(2, 5));
        setUserAmp2(getRandomFloat(0.8, 2));
        setUserPhase2(getRandomFloat(-Math.PI, Math.PI));
        setUserOffset2(0);
      }
    }
  }, [difficulty, target1]);

  // Wave calculations
  const getTargetWaveValue = (x) => {
    if (!target1) return 0;
    const w1 = target1.amp * Math.sin(target1.freq * x + target1.phase) + target1.offset;
    if (difficulty < 5 || !target2) return w1;

    const w2 = target2.amp * Math.sin(target2.freq * x + target2.phase) + target2.offset;
    return w1 + w2;
  };

  const getUserWaveValue = (x) => {
    const w1 = userAmp1 * Math.sin(userFreq1 * x + userPhase1) + userOffset1;
    if (difficulty < 5) return w1;

    const w2 = userAmp2 * Math.sin(userFreq2 * x + userPhase2) + userOffset2;
    return w1 + w2;
  };

  // Build wave data
  const samplesCount = 30;
  const xValues = [];
  const targetValues = [];
  const userValues = [];

  for (let i = 0; i < samplesCount; i++) {
    const x = (Math.PI * 2 * i) / (samplesCount - 1);
    xValues.push(x);
    targetValues.push(getTargetWaveValue(x));
    userValues.push(getUserWaveValue(x));
  }

  // Calculate RMSE
  let sumSqDiff = 0;
  for (let i = 0; i < samplesCount; i++) {
    const diff = targetValues[i] - userValues[i];
    sumSqDiff += diff * diff;
  }
  const rmse = Math.sqrt(sumSqDiff / samplesCount);

  // Difficulty-based threshold
  let matchThreshold = 0.2; // easiest
  if (difficulty === 2) matchThreshold = 0.15;
  if (difficulty === 3) matchThreshold = 0.1;
  if (difficulty === 4) matchThreshold = 0.07;
  if (difficulty === 5) matchThreshold = 0.05;

  // Visual feedback for how close the waves are
  const lockStrength = Math.max(0, Math.min(1, 1 - rmse / matchThreshold));
  const lockLabel =
    lockStrength >= 0.98 ? 'Signal Locked' : lockStrength >= 0.7 ? 'Closing Phase' : 'Searching Spectrum';
  const lockClass = lockStrength >= 0.98 ? 'locked' : lockStrength >= 0.7 ? 'warm' : 'cold';

  // One-shot solver guard
  const finalizePuzzle = useCallback(() => {
    if (solvedRef.current) return;
    solvedRef.current = true;
    clearTimeout(stableMatchTimer.current);

    if (isFirestorePuzzle) {
      updateDoc(puzzleDocRef, { status: 'SOLVED' }).catch((err) =>
        console.error('Error setting puzzle to SOLVED:', err),
      );
    } else if (onLocalPuzzleComplete) {
      onLocalPuzzleComplete();
    }
  }, [isFirestorePuzzle, puzzleDocRef, onLocalPuzzleComplete]);

  // Checking puzzle status => if under threshold for 2s => solved.
  // Also: if the lock meter actually hits 100%, solve immediately.
  useEffect(() => {
    if (!target1) return;

    const puzzleIsInProgress = (isFirestorePuzzle && layerData?.status === 'IN_PROGRESS') || !isFirestorePuzzle;
    if (!puzzleIsInProgress) return;

    if (lockStrength >= 0.999) {
      finalizePuzzle();
      return;
    }

    if (rmse < matchThreshold) {
      stableMatchTimer.current = setTimeout(() => {
        finalizePuzzle();
      }, 2000);
    } else {
      clearTimeout(stableMatchTimer.current);
    }

    return () => clearTimeout(stableMatchTimer.current);
  }, [
    rmse,
    matchThreshold,
    target1,
    puzzleDocRef,
    isFirestorePuzzle,
    layerData?.status,
    onLocalPuzzleComplete,
    finalizePuzzle,
    lockStrength,
  ]);

  //
  // Chart styling
  //
  const targetLineWidth = 20 * matchThreshold;
  const userLineWidth = 1;
  const userPointRadius = 3;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    layout: { padding: 8 },
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    scales: {
      x: {
        ticks: { display: false },
        grid: { color: 'rgba(255, 255, 255, 0.04)', lineWidth: 1 },
        border: { display: false },
      },
      y: {
        ticks: { display: false },
        grid: { color: 'rgba(96, 165, 250, 0.08)', lineWidth: 1 },
        min: -3,
        max: 3,
        border: { display: false },
      },
    },
  };

  const chartData = {
    labels: xValues,
    datasets: [
      {
        label: 'Target',
        data: targetValues,
        borderColor: 'rgba(255, 0, 0, 0.9)',
        borderWidth: targetLineWidth,
        pointRadius: 0,
        fill: false,
        tension: 0.4,
      },
      {
        label: 'User',
        data: userValues,
        borderColor: '#2de2e6',
        borderWidth: userLineWidth,
        pointBorderColor: '#2de2e6',
        pointBackgroundColor: '#2de2e6',
        pointRadius: userPointRadius,
        fill: false,
        tension: 0.4,
      },
    ],
  };

  return (
    <div className="puzzle-shell puzzle-frequency puzzle-container freq-shell">
      <h2 className="puzzle-title">[ Frequency Tuner ]</h2>

      {showTutorial && (
        <TutorialModal
          isOpen={showTutorial}
          onClose={() => {
            setShowTutorial(false);
            try {
              localStorage.setItem(TUTORIAL_KEY, 'seen');
            } catch (e) {
              console.warn('Unable to persist tutorial flag', e);
            }
          }}
          title="Frequency Tuner // Quick Briefing"
          intro="Align your outgoing waveform to the incoming carrier. Keep drift below tolerance until the lock turns solid red."
          bullets={[
            'Adjust sliders; watch the drift and meter charge toward 100%.',
            'Once locked, the puzzle auto-completes.',
          ]}
          ctaLabel="Understood"
        />
      )}

      <div className="freq-panel puzzle-panel">
        <header className="freq-header puzzle-header">
          <div className="freq-titleblock">
            <p className="freq-eyebrow puzzle-eyebrow">Red Channel // Frequency Tuning</p>
          </div>
          <div className="freq-actions">
            <div className="freq-lock-card puzzle-card">
              <div className="freq-lock-row">
                <span className={`freq-lock-dot ${lockClass}`} />
                <span className="freq-lock-label">{lockLabel}</span>
                <span className="freq-lock-percent">{Math.round(lockStrength * 100)}%</span>
              </div>
              <div className="puzzle-meter">
                <div className="puzzle-meter-fill" style={{ width: `${Math.round(lockStrength * 100)}%` }} />
              </div>
              <div className="freq-lock-stats">
                <span>drift {rmse.toFixed(3)}</span>
                <span>tolerance {matchThreshold.toFixed(3)}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="freq-oscilloscope-wrap">
          <div className="freq-oscilloscope puzzle-panel">
            <div className="freq-oscilloscope-glow" />
            <div className="freq-chart">
              <Line data={chartData} options={chartOptions} />
            </div>
            <div className="freq-legend">
              <div className="legend-entry">
                <span className="legend-dot target" />
                <span>Target</span>
              </div>
              <div className="legend-entry">
                <span className="legend-dot user" />
                <span>User</span>
              </div>
            </div>
          </div>
        </div>

        {difficulty === 5 && (
          <div className="freq-tabs">
            <button
              className={`freq-tab-btn puzzle-tab ${activeWave === 1 ? 'active' : ''}`}
              onClick={() => setActiveWave(1)}
            >
              Wave 01
            </button>
            <button
              className={`freq-tab-btn puzzle-tab ${activeWave === 2 ? 'active' : ''}`}
              onClick={() => setActiveWave(2)}
            >
              Wave 02
            </button>
          </div>
        )}

        <div className="freq-grid">
          {(activeWave === 1 || difficulty < 5) && (
            <div className="freq-card puzzle-card">
              <div className="freq-card-head">
                <span className="freq-badge">Wave 01</span>
                <span className="freq-card-meta">Primary carrier</span>
              </div>

              <div className="freq-slider">
                <div className="freq-slider-label">
                  <span>Frequency</span>
                  <span className="freq-slider-value">{userFreq1.toFixed(2)} Hz</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="10"
                  step="0.01"
                  value={userFreq1}
                  onChange={(e) => setUserFreq1(parseFloat(e.target.value))}
                  className="freq-range puzzle-range"
                />
              </div>

              {difficulty >= 2 && (
                <div className="freq-slider">
                  <div className="freq-slider-label">
                    <span>Amplitude</span>
                    <span className="freq-slider-value">{userAmp1.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="3"
                    step="0.01"
                    value={userAmp1}
                    onChange={(e) => setUserAmp1(parseFloat(e.target.value))}
                    className="freq-range puzzle-range"
                  />
                </div>
              )}

              {difficulty >= 3 && (
                <div className="freq-slider">
                  <div className="freq-slider-label">
                    <span>Phase</span>
                    <span className="freq-slider-value">{userPhase1.toFixed(2)} rad</span>
                  </div>
                  <input
                    type="range"
                    min={-Math.PI}
                    max={Math.PI}
                    step="0.01"
                    value={userPhase1}
                    onChange={(e) => setUserPhase1(parseFloat(e.target.value))}
                    className="freq-range puzzle-range"
                  />
                </div>
              )}

              {difficulty === 4 && (
                <div className="freq-slider">
                  <div className="freq-slider-label">
                    <span>Offset</span>
                    <span className="freq-slider-value">{userOffset1.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min={-2}
                    max={2}
                    step="0.01"
                    value={userOffset1}
                    onChange={(e) => setUserOffset1(parseFloat(e.target.value))}
                    className="freq-range puzzle-range"
                  />
                </div>
              )}
            </div>
          )}

          {difficulty === 5 && activeWave === 2 && (
            <div className="freq-card puzzle-card">
              <div className="freq-card-head">
                <span className="freq-badge">Wave 02</span>
                <span className="freq-card-meta">Interference layer</span>
              </div>

              <div className="freq-slider">
                <div className="freq-slider-label">
                  <span>Frequency</span>
                  <span className="freq-slider-value">{userFreq2.toFixed(2)} Hz</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="10"
                  step="0.01"
                  value={userFreq2}
                  onChange={(e) => setUserFreq2(parseFloat(e.target.value))}
                  className="freq-range puzzle-range"
                />
              </div>

              <div className="freq-slider">
                <div className="freq-slider-label">
                  <span>Amplitude</span>
                  <span className="freq-slider-value">{userAmp2.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="3"
                  step="0.01"
                  value={userAmp2}
                  onChange={(e) => setUserAmp2(parseFloat(e.target.value))}
                  className="freq-range puzzle-range"
                />
              </div>

              <div className="freq-slider">
                <div className="freq-slider-label">
                  <span>Phase</span>
                  <span className="freq-slider-value">{userPhase2.toFixed(2)} rad</span>
                </div>
                <input
                  type="range"
                  min={-Math.PI}
                  max={Math.PI}
                  step="0.01"
                  value={userPhase2}
                  onChange={(e) => setUserPhase2(parseFloat(e.target.value))}
                  className="freq-range puzzle-range"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Helper to generate wave params that won't be "flat":
 * - freq >= 2 => at least 2 cycles in 0..2*pi
 * - amp >= 0.8 => no near-flat amplitude
 */
function generateWaveParams(difficulty) {
  const freq = getRandomFloat(2, 5);
  let amp = 1;
  let phase = 0;
  let offset = 0;

  if (difficulty >= 2) {
    amp = getRandomFloat(0.8, 2);
  }
  if (difficulty >= 3) {
    phase = getRandomFloat(-Math.PI, Math.PI);
  }
  if (difficulty === 4) {
    offset = getRandomFloat(-1, 1);
  }
  return { freq, amp, phase, offset };
}

export default FrequencyPuzzle;
