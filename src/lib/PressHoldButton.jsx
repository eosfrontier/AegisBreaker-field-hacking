import { useRef } from 'react';

/**
 * PressHoldButton
 *
 * A reusable component that:
 * - Calls `onPress(delta)` once immediately on mouse/touch down
 * - Repeats calling `onPress(delta)` every `repeatRateMs` until mouse/touch up
 * - Ramps the magnitude of `delta` over time for better precision on quick taps
 *
 * Props:
 * - label (string): The text to show on the button
 * - delta (number): The rotation delta to pass to onPress
 * - onPress (function): The callback to rotate
 * - repeatRateMs (number): Interval for repeating calls (default 150ms)
 */
export default function PressHoldButton({ label, delta, onPress, repeatRateMs = 150 }) {
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  // Start slow for precision, then ramp to 2x speed after ~2s of holding
  const getRampMultiplier = (elapsedMs) => {
    if (elapsedMs < 300) return 0.25;
    if (elapsedMs < 1000) return 0.25 + ((elapsedMs - 300) / 700) * 0.75; // up to 1x
    if (elapsedMs < 2000) return 1 + ((elapsedMs - 1000) / 1000); // up to 2x
    return 2;
  };

  const handlePressStart = (e) => {
    e.preventDefault();
    startTimeRef.current = Date.now();

    const initialMultiplier = getRampMultiplier(0);
    // Rotate once immediately
    onPress(delta * initialMultiplier);

    // Then start the interval
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const rampedDelta = delta * getRampMultiplier(elapsed);
      onPress(rampedDelta);
    }, repeatRateMs);
  };

  const handlePressEnd = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    startTimeRef.current = null;
  };

  return (
    <button
      className="press-hold-button"
      onMouseDown={handlePressStart}
      onMouseUp={handlePressEnd}
      onMouseLeave={handlePressEnd}
      onTouchStart={handlePressStart}
      onTouchEnd={handlePressEnd}
    >
      {label}
    </button>
  );
}
