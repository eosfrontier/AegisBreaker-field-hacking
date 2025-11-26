import { useMemo, useState } from 'react';

import BootSplash from './BootSplash';
import SequencePuzzle from '../Puzzle/SequencePuzzle';
import FrequencyPuzzle from '../Puzzle/FrequencyPuzzle';
import LogicPuzzle from '../Puzzle/LogicPuzzle';
import MasterLockPuzzle from '../Puzzle/MasterLockPuzzle';

import UnlockedLockSVG from '../../assets/lock-unlock-icon-22.svg';

const DEFAULT_BOOT_STEPS = [
  { label: 'Establishing secure connection...', ms: 420 },
  { label: 'Identifying attack vector...', ms: 500 },
  { label: 'Decoding encryption...', ms: 520 },
  { label: 'Accessing ICE layer...', ms: 480 },
  { label: 'Channel stable.', ms: 320 },
];

/**
 * Shared puzzle wrapper used by both session-based puzzles and local QuickHack puzzles.
 */
export default function PuzzleHost({
  loading = false,
  puzzleType,
  layerData,
  sessionId,
  layerId,
  bootSteps = DEFAULT_BOOT_STEPS,
  allowBootSkip = true,
  skipBootKey = 'ab:bootSkipOnce',
  onExit,
  onLocalPuzzleComplete,
}) {
  const [showBoot, setShowBoot] = useState(() => {
    if (!skipBootKey) return true;
    try {
      const skip = sessionStorage.getItem(skipBootKey) === '1';
      if (skip) sessionStorage.removeItem(skipBootKey);
      return !skip;
    } catch {
      return true;
    }
  });
  const [localSolved, setLocalSolved] = useState(false);

  const handleBootDone = () => setShowBoot(false);

  const handleLocalSolved = () => {
    setLocalSolved(true);
    onLocalPuzzleComplete?.();
  };

  const isSolved = useMemo(() => localSolved || layerData?.status === 'SOLVED', [localSolved, layerData]);

  const bootOverlay = (
    <BootSplash show={showBoot || loading} onDone={handleBootDone} steps={bootSteps} allowSkip={allowBootSkip} />
  );

  if (isSolved) {
    return (
      <div className="main layer-solved" style={{ textAlign: 'center' }}>
        <h3>Layer solved</h3>
        <img
          src={UnlockedLockSVG}
          alt="Unlocked lock"
          className="filter-green"
          style={{ opacity: 0.4, width: '230px', height: '280px' }}
        />
        {onExit && (
          <button className="qh-btn" onClick={onExit}>
            Close connection
          </button>
        )}
      </div>
    );
  }

  if (loading || showBoot) {
    return (
      <div className="main" style={{ minHeight: '60vh' }}>
        {bootOverlay}
      </div>
    );
  }

  let content = null;
  switch (puzzleType) {
    case 'sequence':
      content = (
        <SequencePuzzle
          sessionId={sessionId}
          layerId={layerId}
          layerData={layerData}
          onLocalPuzzleComplete={handleLocalSolved}
        />
      );
      break;
    case 'frequencyTuning':
      content = (
        <FrequencyPuzzle
          sessionId={sessionId}
          layerId={layerId}
          layerData={layerData}
          onLocalPuzzleComplete={handleLocalSolved}
        />
      );
      break;
    case 'logic':
      content = (
        <LogicPuzzle
          sessionId={sessionId}
          layerId={layerId}
          layerData={layerData}
          onLocalPuzzleComplete={handleLocalSolved}
        />
      );
      break;
    case 'masterLock':
      content = (
        <MasterLockPuzzle
          sessionId={sessionId}
          layerId={layerId}
          layerData={layerData}
          onLocalPuzzleComplete={handleLocalSolved}
        />
      );
      break;
    default:
      content = <div style={{ padding: '1rem' }}>Unknown puzzle type!</div>;
  }

  return (
    <div className="main">
      {bootOverlay}
      {content}
    </div>
  );
}
