import { useEffect, useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import PressHoldButton from '../../utils/PressHoldButton';

import './MasterLockPuzzle.css';

/**
 * MasterLockPuzzle with:
 *  - Obfuscated ring order (a random permutation)
 *  - Random rotation ratios (including negative)
 *
 * The user sees "Ring 1" as the physically outer ring,
 * but internally, that might be puzzle index #2 in the BFS logic.
 */

// 1) A random dash generator, ensuring big arcs/gaps
function getRandomBaseDashTwoBigChunks() {
  const paintValues = [];
  const gapValues = [];
  const bigPaintIndex = Math.floor(Math.random() * 4);
  const bigGapIndex = Math.floor(Math.random() * 4);

  for (let i = 0; i < 4; i++) {
    // Big or smaller paint
    if (i === bigPaintIndex) {
      paintValues.push(20 + Math.floor(Math.random() * 11)); // 20..30
    } else {
      paintValues.push(5 + Math.floor(Math.random() * 11)); // 5..15
    }
    // Big or smaller gap
    if (i === bigGapIndex) {
      gapValues.push(20 + Math.floor(Math.random() * 11)); // 20..30
    } else {
      gapValues.push(5 + Math.floor(Math.random() * 8)); // 5..12
    }
  }

  const dashArray = [];
  for (let i = 0; i < 4; i++) {
    dashArray.push(paintValues[i], gapValues[i]);
  }
  return dashArray;
}

// Generate a random permutation of [0..(n-1)]
function generatePermutation(ringCount) {
  const arr = [...Array(ringCount).keys()];
  for (let i = arr.length - 1; i > 0; i--) {
    const r = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[r]] = [arr[r], arr[i]];
  }
  return arr;
}

// Generate random DAG links with rotation ratio
function generateRandomLinks(ringCount, difficulty) {
  if (ringCount <= 1) {
    return Array.from({ length: ringCount }, () => []);
  }

  let numLinks;
  if (difficulty < 3) {
    numLinks = 0;
  } else if (difficulty === 3) {
    numLinks = 2;
  } else if (difficulty === 4) {
    numLinks = 3;
  } else {
    // difficulty >= 5
    numLinks = 4 + Math.floor(Math.random() * 2); // 3 or 4
  }

  const links = Array.from({ length: ringCount }, () => []);
  const possibleEdges = [];
  for (let i = 0; i < ringCount - 1; i++) {
    for (let j = i + 1; j < ringCount; j++) {
      possibleEdges.push([i, j]);
    }
  }

  // Shuffle
  for (let k = possibleEdges.length - 1; k > 0; k--) {
    const r = Math.floor(Math.random() * (k + 1));
    [possibleEdges[k], possibleEdges[r]] = [possibleEdges[r], possibleEdges[k]];
  }

  let count = 0;
  let idx = 0;
  while (count < numLinks && idx < possibleEdges.length) {
    const [i, j] = possibleEdges[idx++];
    // random ratio from e.g. -1, -0.5, 0.5, 1
    const ratioOptions = [-1, -0.5, 0.5, 1];
    const ratio = ratioOptions[Math.floor(Math.random() * ratioOptions.length)];
    links[i].push({ ring: j, ratio });
    count++;
  }

  return links;
}

// BFS to apply rotation with ratio
function applyRotationWithLinks(start, delta, rawAngles, links) {
  const newAngles = [...rawAngles];
  const queue = [start];
  const visited = new Set([start]);

  // ring 'start' also rotates
  newAngles[start] += delta;

  while (queue.length > 0) {
    const curr = queue.shift();
    const children = links[curr] || [];
    for (const { ring: child, ratio } of children) {
      if (!visited.has(child)) {
        visited.add(child);
        newAngles[child] += ratio * delta;
        queue.push(child);
      }
    }
  }

  return newAngles;
}

// ======= 2) The Puzzle Component ======= //

const MasterLockPuzzle = ({ sessionId, layerId, layerData, onLocalPuzzleComplete }) => {
  const difficulty = Number(layerData?.difficulty || 1);
  const ringCount = Math.min(Math.max(difficulty + 2, 3), 6);

  // Circle geometry
  const R_BASE = 40; // outer ring radius
  const C_BASE = 2 * Math.PI * R_BASE;
  const ringSpacing = 6;

  // Puzzle states
  const [perm, setPerm] = useState([]); // physical ring i -> puzzle index
  const [links, setLinks] = useState([]); // adjacency list with ratio
  const [baseDash, setBaseDash] = useState(null);

  const [rawAngles, setRawAngles] = useState([]);
  const [displayAngles, setDisplayAngles] = useState([]);

  // A new state to track "solved" so we can freeze rings
  const [isSolved, setIsSolved] = useState(false);
  // Another state to handle "showing locked overlay" vs "final puzzle solved screen"
  const [showLockedOverlay, setShowLockedOverlay] = useState(false);
  const [showFinalScreen, setShowFinalScreen] = useState(false);

  // On mount, randomize puzzle
  useEffect(() => {
    // 1) random permutation
    const p = generatePermutation(ringCount);
    setPerm(p);

    // 2) random angles
    const angles = Array.from({ length: ringCount }, () => {
      const k = Math.floor(Math.random() * 72); // 0..71 => multiples of 5
      return k * 5;
    });
    setRawAngles(angles);
    setDisplayAngles(angles.map((a) => ((a % 360) + 360) % 360));

    // 3) dash pattern
    setBaseDash(getRandomBaseDashTwoBigChunks());

    // 4) links
    setLinks(generateRandomLinks(ringCount, difficulty));
  }, [ringCount, difficulty]);

  // Update displayAngles on rawAngles change (shortest path)
  useEffect(() => {
    if (rawAngles.length === 0) return;
    setDisplayAngles((prevDisp) => {
      return rawAngles.map((rawAngle, i) => {
        const oldDisp = prevDisp[i] ?? 0;
        let newDisp = rawAngle % 360;
        if (newDisp < 0) newDisp += 360;

        let diff = newDisp - oldDisp;
        if (diff > 180) diff -= 360;
        else if (diff < -180) diff += 360;
        return oldDisp + diff;
      });
    });
  }, [rawAngles]);

  // Solve check
  useEffect(() => {
    if (rawAngles.length === 0) return;
    if (isSolved) return; // already locked

    const tolerance = 3;
    const baseAngle = rawAngles[0];
    const allAligned = rawAngles.every((angle) => {
      let diff = (angle - baseAngle) % 360;
      if (diff < 0) diff += 360;
      return diff < tolerance || Math.abs(diff - 360) < tolerance;
    });

    if (allAligned) {
      setIsSolved(true);
      setShowLockedOverlay(true);

      setTimeout(() => {
        setShowLockedOverlay(false);
        setShowFinalScreen(true);

        // Firestore / local callback
        (async () => {
          if (sessionId && layerId) {
            try {
              const layerRef = doc(db, 'sessions', sessionId, 'layers', layerId);
              await updateDoc(layerRef, { status: 'SOLVED' });
            } catch (err) {
              console.error('Error marking solved:', err);
            }
          } else if (onLocalPuzzleComplete) {
            onLocalPuzzleComplete();
          }
        })();
      }, 2000); // 2s "locked" overlay
    }
  }, [rawAngles, isSolved, sessionId, layerId, onLocalPuzzleComplete]);

  // rotate a physical ring => puzzle index => BFS
  const rotateRing = (i, delta) => {
    // If puzzle is solved, ignore rotation
    if (isSolved) return;

    const puzzleIndex = perm[i];
    setRawAngles((prev) => applyRotationWithLinks(puzzleIndex, delta, prev, links));
  };

  // scale dash array
  const getScaledDashArray = (radius) => {
    if (!baseDash) return '20 10 5 10';
    const c = 2 * Math.PI * radius;
    const scale = c / C_BASE;
    const scaled = baseDash.map((val) => val * scale);
    return scaled.join(' ');
  };

  // If the puzzle is fully done, show the final screen
  if (showFinalScreen) {
    return (
      <div className="masterlock-solved-screen">
        <h2>LOCK SOLVED</h2>
      </div>
    );
  }

  return (
    <div className="masterlock-container">
      <h2>[Datalink Splicing]</h2>
      <div className="masterlock-stage">
        {Array.from({ length: ringCount }).map((_, i) => {
          // i => physical ring index (0 = largest, 1 = next, etc.)
          const puzzleIndex = perm[i] ?? 0;
          const dispAngle = displayAngles[puzzleIndex] ?? 0;
          const radius = R_BASE - i * ringSpacing;
          if (radius <= 0) return null;
          const dashPattern = getScaledDashArray(radius);

          return (
            <div key={i} className="ring-wrapper" style={{ transform: `rotate(${dispAngle}deg)` }}>
              <svg viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="none"
                  stroke="#BF00FF"
                  strokeWidth="6"
                  strokeDasharray={dashPattern}
                />
              </svg>
            </div>
          );
        })}
        {/* Overlay if puzzle is locked */}
        {showLockedOverlay && (
          <div className="locked-overlay">
            <div className="locked-message">
              <h2>Lock Bypassed...</h2>
            </div>
          </div>
        )}
      </div>

      {/* If puzzle not solved, show ring controls */}
      {!isSolved && (
        <div className="controls">
          {Array.from({ length: ringCount }).map((_, i) => {
            return (
              <div key={i} className="control-row">
                <PressHoldButton label="-" delta={-5} onPress={(delta) => rotateRing(i, delta)} />
                <span>{i + 1}</span>
                <PressHoldButton label="+" delta={+5} onPress={(delta) => rotateRing(i, delta)} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MasterLockPuzzle;
