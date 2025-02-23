import { useEffect, useState, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import PressHoldButton from '../../utils/PressHoldButton';

import './MasterLockPuzzle.css';

function getRandomBaseDash() {
  // We'll produce 4 paint values and 4 gap values
  const paintValues = [];
  const gapValues = [];

  // 1) Randomly pick which paint index is big
  const bigPaintIndex = Math.floor(Math.random() * 4); // 0..3
  // 2) Randomly pick which gap index is big
  let bigGapIndex = Math.floor(Math.random() * 4);
  // If you'd like to guarantee they are different indices, do:
  // while (bigGapIndex === bigPaintIndex) {
  //   bigGapIndex = Math.floor(Math.random() * 4);
  // }

  for (let i = 0; i < 4; i++) {
    // Paint chunk
    if (i === bigPaintIndex) {
      // e.g. big paint in [20..30]
      paintValues.push(Math.floor(Math.random() * 11) + 30);
    } else {
      // smaller paint in [5..15]
      paintValues.push(Math.floor(Math.random() * 11) + 5);
    }

    // Gap chunk
    if (i === bigGapIndex) {
      // e.g. big gap in [20..30]
      gapValues.push(Math.floor(Math.random() * 11) + 30);
    } else {
      // smaller gap in [5..12]
      gapValues.push(Math.floor(Math.random() * 8) + 5);
    }
  }

  // Interleave them: [paint0, gap0, paint1, gap1, paint2, gap2, paint3, gap3]
  const dashArray = [];
  for (let i = 0; i < 4; i++) {
    dashArray.push(paintValues[i], gapValues[i]);
  }

  return dashArray;
}

const MasterLockPuzzle = ({ sessionId, layerId, layerData, onLocalPuzzleComplete }) => {
  // 1) Decide ringCount from difficulty
  const difficulty = Number(layerData?.difficulty || 1);
  const ringCount = Math.min(Math.max(difficulty + 2, 3), 6);
  // For example, difficulty=1 => 3 rings, difficulty=4 => 6 rings

  // 2) Base circle details
  const R_BASE = 40; // outer ring radius
  const [baseDash, setBaseDash] = useState(null);
  const ringSpacing = 6; // each inner ring shrinks by 6 radius from the previous

  // 3) We'll store raw angles (unbounded) and display angles (shortest path)
  const [rawAngles, setRawAngles] = useState([]);
  const [displayAngles, setDisplayAngles] = useState([]);

  useEffect(() => {
    setBaseDash(getRandomBaseDash());
  }, []);

  // On mount, randomize each ring in multiples of 5° (0..355)
  useEffect(() => {
    const angles = Array.from({ length: ringCount }, () => {
      const k = Math.floor(Math.random() * 72); // 0..71
      return k * 5; // multiple of 5
    });
    setRawAngles(angles);
    // Initialize display angles
    setDisplayAngles(angles.map((a) => ((a % 360) + 360) % 360));
  }, [ringCount]);

  // "Shortest path" effect: whenever rawAngles changes
  useEffect(() => {
    if (rawAngles.length === 0) return;
    setDisplayAngles((prevDisp) => {
      return rawAngles.map((rawAngle, i) => {
        const oldDisp = prevDisp[i] ?? 0;
        let modded = rawAngle % 360;
        if (modded < 0) modded += 360;

        let diff = modded - oldDisp;
        if (diff > 180) diff -= 360;
        else if (diff < -180) diff += 360;

        return oldDisp + diff;
      });
    });
  }, [rawAngles]);

  // 4) Solve check: If all angles near 0°, puzzle solved
  useEffect(() => {
    if (rawAngles.length === 0) return;

    const tolerance = 3;
    const baseAngle = rawAngles[0];

    const allAligned = rawAngles.every((angle) => {
      let diff = (angle - baseAngle) % 360;
      if (diff < 0) diff += 360; // keep it in [0..360)
      // Now check if diff is within ~3° of 0 or 360
      return diff < tolerance || Math.abs(diff - 360) < tolerance;
    });

    if (allAligned) {
      (async () => {
        console.log('MasterLockPuzzle solved!');
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
    }
  }, [rawAngles, sessionId, layerId, onLocalPuzzleComplete]);

  // 5) "stageRef" to find puzzle center
  const stageRef = useRef(null);

  // 6) Drag state
  const [dragState, setDragState] = useState({
    draggingRing: null,
    startAngle: 0,
    startRingAngle: 0,
  });

  // 7) Convert (mouseX, mouseY) => angle in [0..360)
  const getAngleFromCenter = (mx, my, cx, cy) => {
    const dx = mx - cx;
    const dy = my - cy;
    let deg = (Math.atan2(dy, dx) * 180) / Math.PI; // -180..180
    if (deg < 0) deg += 360;
    return deg; // 0..360
  };

  // 8) Handler for mouseDown on a ring
  const handleMouseDown = (e, ringIndex) => {
    console.log('mouseDown on ringIndex=', ringIndex);

    e.preventDefault();
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    const mx = e.clientX;
    const my = e.clientY;
    // Distance from center
    const dx = mx - cx;
    const dy = my - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // ringIndex => ring radius
    const ringRadius = R_BASE - ringIndex * ringSpacing;
    const ringThickness = 10; // how wide the band is

    // bounding circle check: must be within [ringRadius - thickness, ringRadius + thickness]
    if (dist < ringRadius - ringThickness || dist > ringRadius + ringThickness) {
      // user didn't actually click ringIndex's band
      return;
    }

    // If we pass, start dragging ringIndex
    const startAng = getAngleFromCenter(mx, my, cx, cy);

    setDragState({
      draggingRing: ringIndex,
      startAngle: startAng,
      startRingAngle: rawAngles[ringIndex],
    });

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // 9) onMouseMove => rotate ring
  const onMouseMove = (e) => {
    if (dragState.draggingRing == null) return;

    const ringIndex = dragState.draggingRing;
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) return;

    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const mx = e.clientX;
    const my = e.clientY;

    const currentAng = getAngleFromCenter(mx, my, cx, cy);
    let deltaAng = currentAng - dragState.startAngle;

    // unify big jumps
    if (deltaAng > 180) deltaAng -= 360;
    if (deltaAng < -180) deltaAng += 360;

    const newAngle = dragState.startRingAngle + deltaAng;

    // Snap to nearest 5°
    const snapped = Math.round(newAngle / 5) * 5;

    setRawAngles((prev) => {
      const next = [...prev];
      next[ringIndex] = snapped;
      return next;
    });
  };

  const onMouseUp = () => {
    setDragState({ draggingRing: null, startAngle: 0, startRingAngle: 0 });
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  };

  // 10) If also allowing +/-5° button presses:
  const rotateRing = (i, delta) => {
    setRawAngles((prev) => {
      const next = [...prev];
      next[i] += delta; // no snap needed here because it's already multiples of 5
      return next;
    });
  };

  // 11) Helper to scale dash array for a given radius
  function getScaledDashArray(radius) {
    // if baseDash hasn't loaded yet, just return something default
    if (!baseDash) return '20 10 5 10';

    const c = 2 * Math.PI * radius;
    // The circumference for R_BASE:
    const C_BASE = 2 * Math.PI * R_BASE;

    const scale = c / C_BASE;
    const scaled = baseDash.map((val) => val * scale);
    return scaled.join(' ');
  }

  return (
    <div className="masterlock-container">
      <h2>Master Lock Puzzle</h2>
      <p>Rotate each ring by dragging or clicking +/-5°!</p>

      <div className="masterlock-stage" ref={stageRef}>
        {/* We map from 0..ringCount-1 
            ring 0 = outer ring, ring ringCount-1 = inner ring
            We'll place ring 0 LAST in the DOM so it has the highest z-index,
            OR explicitly set the zIndex. */}
        {Array.from({ length: ringCount }).map((_, i) => {
          // ring i: bigger => smaller
          // i=0 => outer ring
          const dispAngle = displayAngles[i] ?? 0;
          const r = R_BASE - i * ringSpacing;
          if (r <= 0) return null; // safety

          const dashPattern = getScaledDashArray(r);

          // We want ring 0 to appear on top if they overlap, so let's set a higher z-index for lower i
          const z = ringCount - i; // outer ring => bigger zIndex

          return (
            <div
              key={i}
              className="ring-wrapper"
              style={{
                transform: `rotate(${dispAngle}deg)`,
                zIndex: z, // ensures outer ring is on top of inner ring
              }}
              onMouseDown={(e) => handleMouseDown(e, i)}
            >
              <svg width="100%" height="100%" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r={r}
                  fill="none"
                  stroke="#BF00FF"
                  strokeWidth="6"
                  strokeDasharray={dashPattern}
                />
              </svg>
            </div>
          );
        })}
      </div>

      <div className="controls">
        {rawAngles.map((val, i) => (
          <div key={i} className="control-row">
            <span>Ring {i + 1}</span>
            <PressHoldButton label="-5°" delta={-5} onPress={(delta) => rotateRing(i, delta)} />
            <PressHoldButton label="+5°" delta={+5} onPress={(delta) => rotateRing(i, delta)} />
            <span>
              raw: {val}°, disp: {Math.round(displayAngles[i] || 0)}°
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MasterLockPuzzle;
