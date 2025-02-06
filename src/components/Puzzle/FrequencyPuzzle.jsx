import { useState, useEffect, useRef } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";

import { db } from "../../firebaseConfig";

// Register chart components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

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
  const difficulty = layerData?.difficulty ?? 1;

  // If sessionId/layerId exist, we want to update Firestore. Otherwise, it's local puzzle.
  const isFirestorePuzzle = sessionId && layerId;
  const puzzleDocRef = isFirestorePuzzle
    ? doc(db, "sessions", sessionId, "layers", layerId)
    : null;

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
    const w1 =
      target1.amp * Math.sin(target1.freq * x + target1.phase) + target1.offset;
    if (difficulty < 5 || !target2) return w1;

    const w2 =
      target2.amp * Math.sin(target2.freq * x + target2.phase) + target2.offset;
    return w1 + w2;
  };

  const getUserWaveValue = (x) => {
    const w1 =
      userAmp1 * Math.sin(userFreq1 * x + userPhase1) + userOffset1;
    if (difficulty < 5) return w1;

    const w2 =
      userAmp2 * Math.sin(userFreq2 * x + userPhase2) + userOffset2;
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

  // Checking puzzle status => if under threshold for 2s => solved
  useEffect(() => {
    if (!target1) return;

    // Firestore puzzle => must have layerData?.status === "IN_PROGRESS" 
    // Local puzzle => just check if we haven't called onLocalPuzzleComplete yet
    const puzzleIsInProgress =
      (isFirestorePuzzle && layerData?.status === "IN_PROGRESS") ||
      (!isFirestorePuzzle); // for local, we treat it as "in progress" by default

    if (puzzleIsInProgress && rmse < matchThreshold) {
      stableMatchTimer.current = setTimeout(() => {
        if (isFirestorePuzzle) {
          // Update Firestore
          updateDoc(puzzleDocRef, { status: "SOLVED" })
            .catch((err) => console.error("Error setting puzzle to SOLVED:", err));
        } else if (onLocalPuzzleComplete) {
          // Local puzzle => call the callback
          onLocalPuzzleComplete();
        }
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
    onLocalPuzzleComplete
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
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false }
    },
    scales: {
      x: { display: false },
      y: {
        display: false,
        min: -3,
        max: 3
      }
    }
  };

  const chartData = {
    labels: xValues,
    datasets: [
      {
        label: "Target",
        data: targetValues,
        borderColor: "rgba(255, 0, 0, 0.5)",
        borderWidth: targetLineWidth,
        pointRadius: 0,
        fill: false,
        tension: 0.1
      },
      {
        label: "User",
        data: userValues,
        borderColor: "cyan",
        borderWidth: userLineWidth,
        pointBorderColor: "cyan",
        pointBackgroundColor: "cyan",
        pointRadius: userPointRadius,
        fill: false,
        tension: 0.1
      }
    ]
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        backgroundColor: "#000",
        color: "#fff"
      }}
    >
      {/* Landscape chart at top (16:9 ratio) */}
      <div
        style={{
          width: "100%",
          aspectRatio: "16/9",
          background: "rgba(0,0,0,0.5)",
          position: "relative"
        }}
      >
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Two-column sliders */}
      <div 
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "0.5rem"
        }}
      >
        {/* Column for wave #1 */}
        <div 
          style={{
            flex: "1 1 300px",
            maxWidth: "450px",
            margin: "0.5rem",
            border: "1px solid #333",
            padding: "0.5rem"
          }}
        >
          <h3 style={{ marginTop: 0 }}>Wave #1</h3>

          <div style={{ marginBottom: "0.5rem" }}>
            <label>Freq1: {userFreq1.toFixed(2)}</label>
            <input
              type="range"
              min="2"
              max="10"
              step="0.01"
              value={userFreq1}
              onChange={(e) => setUserFreq1(parseFloat(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          {difficulty >= 2 && (
            <div style={{ marginBottom: "0.5rem" }}>
              <label>Amp1: {userAmp1.toFixed(2)}</label>
              <input
                type="range"
                min="0.8"
                max="3"
                step="0.01"
                value={userAmp1}
                onChange={(e) => setUserAmp1(parseFloat(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>
          )}

          {difficulty >= 3 && (
            <div style={{ marginBottom: "0.5rem" }}>
              <label>Phase1: {userPhase1.toFixed(2)}</label>
              <input
                type="range"
                min={-Math.PI}
                max={Math.PI}
                step="0.01"
                value={userPhase1}
                onChange={(e) => setUserPhase1(parseFloat(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>
          )}

          {difficulty === 4 && (
            <div style={{ marginBottom: "0.5rem" }}>
              <label>Offset1: {userOffset1.toFixed(2)}</label>
              <input
                type="range"
                min={-2}
                max={2}
                step="0.01"
                value={userOffset1}
                onChange={(e) => setUserOffset1(parseFloat(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>
          )}
        </div>

        {/* Column for wave #2 (difficulty=5 only) */}
        {difficulty === 5 && (
          <div
            style={{
              flex: "1 1 300px",
              maxWidth: "450px",
              margin: "0.5rem",
              border: "1px solid #333",
              padding: "0.5rem"
            }}
          >
            <h3 style={{ marginTop: 0 }}>Wave #2</h3>

            <div style={{ marginBottom: "0.5rem" }}>
              <label>Freq2: {userFreq2.toFixed(2)}</label>
              <input
                type="range"
                min="2"
                max="10"
                step="0.01"
                value={userFreq2}
                onChange={(e) => setUserFreq2(parseFloat(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ marginBottom: "0.5rem" }}>
              <label>Amp2: {userAmp2.toFixed(2)}</label>
              <input
                type="range"
                min="0.8"
                max="3"
                step="0.01"
                value={userAmp2}
                onChange={(e) => setUserAmp2(parseFloat(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ marginBottom: "0.5rem" }}>
              <label>Phase2: {userPhase2.toFixed(2)}</label>
              <input
                type="range"
                min={-Math.PI}
                max={Math.PI}
                step="0.01"
                value={userPhase2}
                onChange={(e) => setUserPhase2(parseFloat(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            {/* If you want offset2 for wave #2, add a slider here */}
          </div>
        )}
      </div>

      {/* Debugging info (optional) */}
      <div style={{ padding: "0.5rem", background: "#111" }}>
        <p>RMSE: {rmse.toFixed(3)}</p>
        {target1 && (
          <p>
            Target #1 &gt; freq={target1.freq.toFixed(2)},
            amp={target1.amp.toFixed(2)},
            phase={target1.phase.toFixed(2)},
            offset={target1.offset.toFixed(2)}
          </p>
        )}
        {target2 && (
          <p>
            Target #2 &gt; freq={target2.freq.toFixed(2)},
            amp={target2.amp.toFixed(2)},
            phase={target2.phase.toFixed(2)},
            offset={target2.offset.toFixed(2)}
          </p>
        )}
      </div>
    </div>
  );
};

/**
 * Helper to generate wave params that won't be "flat":
 * - freq >= 2 => at least 2 cycles in 0..2π
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
