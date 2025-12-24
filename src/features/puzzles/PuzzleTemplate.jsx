import { useCallback, useEffect } from 'react';
import { useScriptContext } from '../scripts/ScriptProvider';
import { usePuzzleCompletion } from './common/usePuzzleCompletion';

// Template for new puzzles. Copy, rename, and replace the UI + logic.
export default function PuzzleTemplate({ sessionId, layerId, layerData, onLocalPuzzleComplete }) {
  const difficulty = Number(layerData?.difficulty ?? 1);
  const { setScriptContext } = useScriptContext();
  const { markSolved } = usePuzzleCompletion({ sessionId, layerId, onLocalPuzzleComplete });

  const handleSolved = useCallback(() => {
    void markSolved();
  }, [markSolved]);

  useEffect(() => {
    setScriptContext({ id: 'template', api: {} });
    return () => setScriptContext({ id: null, api: {} });
  }, [setScriptContext]);

  return (
    <div className="puzzle-frame puzzle-template">
      <h2 className="puzzle-title">[ Puzzle Template ]</h2>
      <p className="puzzle-muted">Difficulty: {difficulty}</p>
      <button className="puzzle-button" onClick={handleSolved}>
        Mark Solved (debug)
      </button>
    </div>
  );
}
