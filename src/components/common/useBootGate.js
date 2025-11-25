// hooks/useBootGate.js
import { useRef, useState, useCallback } from 'react';
import BootSplash from '../components/common/BootSplash'; // adjust path

export default function useBootGate({
  defaultSteps = undefined,
  allowSkip = true,
  skipOnceKey = 'ab:bootSkipOnce',
} = {}) {
  const [show, setShow] = useState(false);
  const [steps, setSteps] = useState(defaultSteps);
  const pendingRef = useRef(null);

  const open = useCallback(
    (onComplete, opts = {}) => {
      if (opts.steps) setSteps(opts.steps);
      pendingRef.current = () => {
        if (opts.markSkipOnce && skipOnceKey) {
          try {
            sessionStorage.setItem(skipOnceKey, '1');
          } catch {
            /* empty */
          }
        }
        onComplete?.();
      };
      setShow(true);
    },
    [skipOnceKey],
  );

  const onDone = useCallback(() => {
    setShow(false);
    const cb = pendingRef.current;
    pendingRef.current = null;
    cb?.();
  }, []);

  const shouldSkipOnce = useCallback(() => {
    try {
      return sessionStorage.getItem(skipOnceKey) === '1';
    } catch {
      return false;
    }
  }, [skipOnceKey]);

  const clearSkipOnce = useCallback(() => {
    try {
      sessionStorage.removeItem(skipOnceKey);
    } catch {
      /* empty */
    }
  }, [skipOnceKey]);

  const primeSkipOnce = useCallback(() => {
    try {
      sessionStorage.setItem(skipOnceKey, '1');
    } catch {
      /* empty */
    }
  }, [skipOnceKey]);

  const Overlay = useCallback(
    () => <BootSplash show={show} onDone={onDone} steps={steps} allowSkip={allowSkip} />,
    [show, onDone, steps, allowSkip],
  );

  return {
    // control
    open,
    setSteps,
    // one-shot helpers
    shouldSkipOnce,
    clearSkipOnce,
    primeSkipOnce,
    // overlay element (optional)
    Overlay,
    // raw state if you need it
    show,
  };
}
