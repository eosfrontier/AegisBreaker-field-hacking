import { useRef } from 'react';

/**
 * PressHoldButton
 *
 * A reusable component that:
 * - Calls `onPress(delta)` once immediately on mouse/touch down
 * - Repeats calling `onPress(delta)` every `repeatRateMs` until mouse/touch up
 *
 * Props:
 * - label (string): The text to show on the button
 * - delta (number): The rotation delta to pass to onPress
 * - onPress (function): The callback to rotate
 * - repeatRateMs (number): Interval for repeating calls (default 150ms)
 */
export default function PressHoldButton({ label, delta, onPress, repeatRateMs = 150 }) {
  const intervalRef = useRef(null);

  const handlePressStart = (e) => {
    e.preventDefault();
    // Rotate once immediately
    onPress(delta);

    // Then start the interval
    intervalRef.current = setInterval(() => {
      onPress(delta);
    }, repeatRateMs);
  };

  const handlePressEnd = () => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  return (
    <button
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
