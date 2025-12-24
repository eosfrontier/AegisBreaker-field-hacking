import { useCallback, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebaseConfig';

export function usePuzzleCompletion({ sessionId, layerId, onLocalPuzzleComplete }) {
  const solvedRef = useRef(false);
  const inFlightRef = useRef(false);
  const isSessionPuzzle = Boolean(sessionId && layerId);

  const markSolved = useCallback(async () => {
    if (solvedRef.current || inFlightRef.current) return false;

    if (isSessionPuzzle) {
      inFlightRef.current = true;
      try {
        const layerRef = doc(db, 'sessions', sessionId, 'layers', layerId);
        await updateDoc(layerRef, { status: 'SOLVED' });
        solvedRef.current = true;
        return true;
      } catch (err) {
        console.error('Error marking puzzle solved:', err);
        return false;
      } finally {
        inFlightRef.current = false;
      }
    }

    solvedRef.current = true;
    if (typeof onLocalPuzzleComplete === 'function') {
      onLocalPuzzleComplete();
    }
    return true;
  }, [isSessionPuzzle, sessionId, layerId, onLocalPuzzleComplete]);

  return { isSessionPuzzle, markSolved, solvedRef };
}
