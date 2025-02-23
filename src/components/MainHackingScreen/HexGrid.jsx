import { useRef, useEffect, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import './HexGrid.css';

/**
 * HexGrid Component
 *
 * Props:
 * - layers: Array of layer objects with at least the following properties:
 *    - id: Unique identifier (string)
 *    - status?: "IN_PROGRESS" | "SOLVED" | "LOCKED" | etc.
 * - sessionId: Current session ID used to generate QR code URLs
 * - variant?: "active" | "preview" (Optional; if "preview", we apply .hex-preview style)
 */
function HexGrid({ layers, sessionId, variant }) {
  // Keep a reference to the "previous" snapshot of layers to detect status changes.
  const prevLayersRef = useRef([]);
  // Track layers that just transitioned from IN_PROGRESS to SOLVED.
  // We'll store an object: { [layerId]: timestamp }
  const [justSolvedMap, setJustSolvedMap] = useState({});

  useEffect(() => {
    // Compare the previous layers vs. the current layers
    layers.forEach((layer) => {
      const prevLayer = prevLayersRef.current.find((l) => l.id === layer.id);
      // If it was IN_PROGRESS and is now SOLVED, store a "just solved" timestamp
      if (prevLayer?.status === 'IN_PROGRESS' && layer.status === 'SOLVED') {
        setJustSolvedMap((prev) => ({ ...prev, [layer.id]: Date.now() }));
      }
    });

    // Update the ref to the latest snapshot
    prevLayersRef.current = layers;
  }, [layers]);

  // Clean up old "just solved" entries after a certain time (e.g. 1s),
  // so they don't stay in the local map forever
  useEffect(() => {
    const timer = setInterval(() => {
      setJustSolvedMap((prev) => {
        const now = Date.now();
        // Remove any entries older than 1 second
        const updated = {};
        Object.entries(prev).forEach(([id, t]) => {
          if (now - t < 1000) {
            updated[id] = t; // keep it
          }
        });
        return updated;
      });
    }, 500);

    return () => clearInterval(timer);
  }, []);

  // Helper to determine rotation based on layer ID
  const getRotationFromId = (layerId) => {
    const rotations = [0, 90, 180, 270];
    const sum = layerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return rotations[sum % rotations.length];
  };

  const puzzleTypeColorMap = {
    sequence: '#04d9ee',
    frequencyTuning: '#ff0000',
    logic: '#0aff0a',
    masterLock: '#BF00ff',
  };

  return (
    <ul id="hexGrid">
      {layers.map((layer) => {
        // 1) Determine the normal status-based class
        let statusClass = '';
        if (layer.status === 'IN_PROGRESS') {
          statusClass = 'in-progress'; // blinking
        } else if (layer.status === 'SOLVED') {
          statusClass = 'solved'; // fade-out
        }

        // 2) If the puzzle jumped from IN_PROGRESS to SOLVED instantly,
        //    we keep it in a "just-solved" phase for up to 1 second
        //    so we can see the "Solved" overlay/fade-out visually
        const justSolvedTimestamp = justSolvedMap[layer.id];
        let showSolvedOverlay = false;
        if (justSolvedTimestamp) {
          const elapsed = Date.now() - justSolvedTimestamp;
          if (elapsed < 1000) {
            // STILL within the 1s window => force it to appear with "Solved" overlay
            // so we see a brief fade-out
            statusClass = ''; // remove the 'solved' class to keep it visible
            showSolvedOverlay = true;
          }
        }

        // 3) Determine variant-based class
        const isPreview = variant === 'preview';
        let variantClass = '';
        if (isPreview) {
          variantClass = 'hex-preview'; // locked preview
        }

        const rotationDegrees = getRotationFromId(layer.id);
        const qrValue = `${window.location.origin}/puzzle/${sessionId}/${layer.id}`;

        const difficulty = Number(layer.difficulty) || 1;
        const pipColor = puzzleTypeColorMap[layer.puzzleType] || '#ffffff';

        return (
          <li className={`hex ${statusClass} ${variantClass}`} key={layer.id}>
            <div className="hexIn">
              <div className="hexLink layer-item">
                {/* If preview, show LOCKED */}
                {isPreview ? (
                  <span className="preview-placeholder">LOCKED</span>
                ) : layer.status !== 'SOLVED' ? (
                  <>
                    {/* Circuit Board Image */}
                    <img
                      className="circuit-board"
                      src="/circuitBoard.png"
                      alt="Circuit Board"
                      style={{ transform: `rotate(${rotationDegrees}deg)` }}
                    />
                    {/* QR Code in the center */}
                    <div className="qr-code">
                      <QRCodeCanvas value={qrValue} size={128} bgColor="#000" fgColor="#fff" level="L" marginSize={1} />
                    </div>
                    <div className="pip-row">
                      {Array.from({ length: difficulty }, (_, i) => (
                        <span key={i} className="pip" style={{ backgroundColor: pipColor }} />
                      ))}
                    </div>
                  </>
                ) : (
                  // If it's fully solved OR if it's "just solved" and we want that overlay
                  <span className="solved-overlay">
                    <img
                      className="circuit-board"
                      src="/circuitBoard.png"
                      alt="Circuit Board"
                      style={{ transform: `rotate(${rotationDegrees}deg)` }}
                    />
                    {showSolvedOverlay ? 'Solved' : 'Solved'}
                  </span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default HexGrid;
