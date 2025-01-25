/* eslint-disable react-hooks/rules-of-hooks */
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Utility
function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

const FrequencyPuzzle = ({ sessionId, layerId, layerData }) => {
  const difficulty = layerData?.difficulty ?? 1;
  const puzzleDocRef = doc(db, "sessions", sessionId, "layers", layerId);

  const [target1, setTarget1] = useState(null);
  const [target2, setTarget2] = useState(null);

  // user wave #1
  const [userFreq1, setUserFreq1] = useState(1);
  const [userAmp1, setUserAmp1] = useState(1);
  const [userPhase1, setUserPhase1] = useState(0);
  const [userOffset1, setUserOffset1] = useState(0);

  // user wave #2 (only used if difficulty=5)
  const [userFreq2, setUserFreq2] = useState(1);
  const [userAmp2, setUserAmp2] = useState(1);
  const [userPhase2, setUserPhase2] = useState(0);
  const [userOffset2, setUserOffset2] = useState(0);

  const stableMatchTimer = useRef(null);

  // Generate waves once or if difficulty changes
  useEffect(() => {
    if (!target1) {
      let t1 = {
        freq: getRandomFloat(1, 5),
        amp: difficulty >= 2 ? getRandomFloat(0.5, 2) : 1,
        phase: difficulty >= 3 ? getRandomFloat(-Math.PI, Math.PI) : 0,
        offset: difficulty === 4 ? getRandomFloat(-1, 1) : 0
      };
      let t2 = null;
      if (difficulty === 5) {
        t2 = {
          freq: getRandomFloat(1, 5),
          amp: getRandomFloat(0.5, 2),
          phase: 0,
          offset: 0
        };
        console.log(t2);
        
      }
      setTarget1(t1);
      setTarget2(t2);

      // User wave #1
      setUserFreq1(getRandomFloat(0, 5));
      setUserAmp1(difficulty >= 2 ? getRandomFloat(0.5, 2) : 1);
      setUserPhase1(difficulty >= 3 ? getRandomFloat(-Math.PI, Math.PI) : 0);
      setUserOffset1(difficulty === 4 ? getRandomFloat(-1, 1) : 0);

      // user wave #2
      if (difficulty === 5) {
        setUserFreq2(getRandomFloat(0, 5));
        setUserAmp2(getRandomFloat(0.5, 2));
        setUserPhase2(0);
        setUserOffset2(0);
      }
    }
  }, [difficulty, target1]);

  // Wave calculation
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

  // Compute RMSE
  let sumSqDiff = 0;
  for (let i = 0; i < samplesCount; i++) {
    const diff = targetValues[i] - userValues[i];
    sumSqDiff += diff * diff;
  }
  const rmse = Math.sqrt(sumSqDiff / samplesCount);

  // Dynamic threshold
  let matchThreshold = 0.2;
  if (difficulty === 2) matchThreshold = 0.15;
  if (difficulty === 3) matchThreshold = 0.10;
  if (difficulty === 4) matchThreshold = 0.2;
  if (difficulty === 5) matchThreshold = 0.3;

  // If under threshold for 2s => SOLVED
  useEffect(() => {
    if (!target1) return;
    if (layerData?.status === "IN_PROGRESS") {
      if (rmse < matchThreshold) {
        stableMatchTimer.current = setTimeout(() => {
          updateDoc(puzzleDocRef, { status: "SOLVED" }).catch(console.error);
        }, 2000);
      } else {
        clearTimeout(stableMatchTimer.current);
      }
    }
    return () => clearTimeout(stableMatchTimer.current);
  }, [rmse, matchThreshold, layerData?.status, target1, puzzleDocRef]);

  // Chart style
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
        height: "95vh",
        backgroundColor: "#000",
        color: "#fff"
      }}
    >
      {/* Chart container - landscape style with aspect ratio */}
      <div
        style={{
          width: "100%",
          aspectRatio: "10 / 1",
          background: "rgba(0,0,0,0.5)",
          position: "relative"
        }}
      >
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* 2-column sliders container */}
      <div 
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "0.5rem"
        }}
      >
        {/* Column 1: Sliders for wave #1 */}
        <div 
          style={{
            flex: "1 1 300px",
            maxWidth: "450px",
            margin: "0.5rem",
            border: "1px solid #333",
            padding: "0.5rem"
          }}
        >
          {/* <h3 style={{ marginTop: 0 }}>Wave #1 Controls</h3> */}

          <div style={{ marginBottom: "0.5rem" }}>
            <label>Frequency 1: {userFreq1.toFixed(2)}</label>
            <input
              type="range"
              min="0"
              max="5"
              step="0.01"
              value={userFreq1}
              onChange={(e) => setUserFreq1(parseFloat(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          {difficulty >= 2 && (
            <div style={{ marginBottom: "0.5rem" }}>
              <label>Amplitude 1: {userAmp1.toFixed(2)}</label>
              <input
                type="range"
                min="0"
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
              <label>Phase 1: {userPhase1.toFixed(2)}</label>
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
              <label>Offset 1: {userOffset1.toFixed(2)}</label>
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

        {/* Column 2: Sliders for wave #2 (if difficulty=5) */}
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
            {/* <h3 style={{ marginTop: 0 }}>Wave #2 Controls</h3> */}

            <div style={{ marginBottom: "0.5rem" }}>
              <label>Frequency 2: {userFreq2.toFixed(2)}</label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.01"
                value={userFreq2}
                onChange={(e) => setUserFreq2(parseFloat(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            <div style={{ marginBottom: "0.5rem" }}>
              <label>Amplitude 2: {userAmp2.toFixed(2)}</label>
              <input
                type="range"
                min="0"
                max="3"
                step="0.01"
                value={userAmp2}
                onChange={(e) => setUserAmp2(parseFloat(e.target.value))}
                style={{ width: "100%" }}
              />
            </div>

            {/* <div style={{ marginBottom: "0.5rem" }}>
              <label>Phase 2: {userPhase2.toFixed(2)}</label>
              <input
                type="range"
                min={-Math.PI}
                max={Math.PI}
                step="0.01"
                value={userPhase2}
                onChange={(e) => setUserPhase2(parseFloat(e.target.value))}
                style={{ width: "100%" }}
              />
            </div> */}
            {/* If you want offset for wave2, add a slider here */}
          </div>
        )}
      </div>

      {/* Debug info / RMSE */}
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

export default FrequencyPuzzle;
