// components/UnplannedPuzzle/QuickHackScreen.jsx
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import BootSplash from '../common/BootSplash'; // adjust path if needed
import './QuickHackScreen.css';

import SequencePuzzle from '../Puzzle/SequencePuzzle';
import FrequencyPuzzle from '../Puzzle/FrequencyPuzzle';
import LogicPuzzle from '../Puzzle/LogicPuzzle';
import MasterLockPuzzle from '../Puzzle/MasterLockPuzzle';

// Tools (puzzles) we can offer
const PUZZLE_TOOLS = [
  { type: 'sequence', label: 'Sequencer' },
  { type: 'frequencyTuning', label: 'Frequency Tuner' },
  { type: 'logic', label: 'Logic Sifter' },
  { type: 'masterLock', label: 'Lock Picker' },
];

const DIFFICULTY_LABELS = {
  1: 'Basic',
  2: 'Intermediate',
  3: 'Complex',
  4: 'Intricate',
  5: 'Inscrutable',
};

export default function QuickHackScreen() {
  const [selectedTool, setSelectedTool] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [localPuzzleSolved, setLocalPuzzleSolved] = useState(false);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const puzzleType = searchParams.get('type');
  const puzzleDifficulty = searchParams.get('difficulty');
  const hasPuzzleParams = !!(puzzleType && puzzleDifficulty);

  // BootSplash control
  const [showBoot, setShowBoot] = useState(false);
  const [pendingNav, setPendingNav] = useState(null); // string | null
  const [puzzleReady, setPuzzleReady] = useState(() => {
    // If we arrived with params, show splash unless a one-shot skip is set
    if (hasPuzzleParams) {
      const skip = sessionStorage.getItem('ab:bootSkipOnce') === '1';
      if (skip) {
        sessionStorage.removeItem('ab:bootSkipOnce');
        return true;
      }
      return false;
    }
    return true; // on the start screen we’re already “ready”
  });

  // If params change (deep-link or switching puzzles), (re)show splash unless skip flag is set
  useEffect(() => {
    if (hasPuzzleParams) {
      const skip = sessionStorage.getItem('ab:bootSkipOnce') === '1';
      if (skip) {
        sessionStorage.removeItem('ab:bootSkipOnce');
        setPuzzleReady(true);
        setShowBoot(false);
      } else {
        setPuzzleReady(false);
        setShowBoot(true);
      }
    } else {
      setShowBoot(false);
      setPuzzleReady(true);
    }
  }, [hasPuzzleParams]);

  const handleLocalPuzzleComplete = () => setLocalPuzzleSolved(true);

  const handleStartPuzzle = () => {
    if (!selectedTool || !selectedDifficulty) return;
    // Show splash first, then navigate to /QuickHack?type=...&difficulty=...
    const target = `/QuickHack?type=${selectedTool}&difficulty=${selectedDifficulty}`;
    setPendingNav(target);
    setShowBoot(true);
  };

  // BootSplash callback
  const handleBootDone = () => {
    if (pendingNav) {
      // We’re about to navigate → skip splash on the landing render
      sessionStorage.setItem('ab:bootSkipOnce', '1');
      const to = pendingNav;
      setPendingNav(null);
      setShowBoot(false);
      navigate(to);
    } else {
      // Deep-linked: unlock puzzle render now
      setShowBoot(false);
      setPuzzleReady(true);
    }
  };

  // START SCREEN (no params)
  if (!hasPuzzleParams && !localPuzzleSolved) {
    return (
      <div className="main" style={{ padding: '16px', margin: '0 auto' }}>
        {/* Boot overlay only shows when user taps Engage */}
        <BootSplash
          show={showBoot}
          onDone={handleBootDone}
          steps={[
            { label: 'Requesting runtime…', ms: 300 },
            { label: 'Spoofing signature…', ms: 420 },
            { label: 'Bypassing ICE…', ms: 500 },
            { label: 'Injecting payload…', ms: 420 },
            { label: 'Program engaged.', ms: 280 },
          ]}
        />

        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          {/* Left: Tools */}
          <div style={{ marginRight: '1rem' }}>
            <h2 style={{ minHeight: '72px' }}>Select Tool</h2>
            <div style={{ display: 'flex', flexDirection: 'column', float: 'left' }}>
              {PUZZLE_TOOLS.map((tool) => (
                <button
                  key={tool.type}
                  onClick={() => setSelectedTool(tool.type)}
                  className="qh-btn"
                  style={{
                    display: 'block',
                    margin: '0.5rem 0',
                    padding: '0.5rem 1rem',
                    background: selectedTool === tool.type ? '#4d5356' : 'var(--surface-2)',
                    border: '1px solid var(--card-border)',
                  }}
                >
                  {tool.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Difficulty */}
          <div style={{ textAlign: 'right' }}>
            <h2>Select Defense Quality</h2>
            <div style={{ display: 'flex', flexDirection: 'column', float: 'right' }}>
              {Object.entries(DIFFICULTY_LABELS).map(([num, label]) => (
                <button
                  key={num}
                  onClick={() => setSelectedDifficulty(num)}
                  className="qh-btn"
                  style={{
                    display: 'block',
                    margin: '0.5rem 0',
                    padding: '0.5rem 1rem',
                    background: String(selectedDifficulty) === num ? '#4d5356' : 'var(--surface-2)',
                    border: '1px solid var(--card-border)',
                    width: '140px',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Start */}
        <div style={{ display: 'flex', justifyContent: 'center', flexDirection: 'column', alignItems: 'center' }}>
          <h2>Run Program</h2>
          <button
            className="qh-btn"
            disabled={!selectedTool || !selectedDifficulty}
            onClick={handleStartPuzzle}
            style={{
              padding: '1rem 2rem',
              background: !selectedTool || !selectedDifficulty ? 'var(--btn-disabled)' : 'var(--btn-bg)',
              border: 'none',
              maxWidth: '200px',
            }}
          >
            Engage
          </button>
        </div>
      </div>
    );
  }

  // SOLVED SCREEN
  if (localPuzzleSolved) {
    return (
      <div
        className="Quickhack-main"
        style={{
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          width: '300px',
          margin: '0 auto',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <h2>Hack Succeeded!</h2>
        <img
          src="/lock-unlock-icon-22.png"
          alt="Unlocked lock"
          className="Unlocked-lock"
          style={{ width: '230px', height: '280px' }}
        />
        <button className="qh-btn" onClick={() => navigate('/')}>
          Close connection
        </button>
      </div>
    );
  }

  // PUZZLE RENDER — gated by splash on deep-link
  if (!puzzleReady) {
    return (
      <div className="Quickhack-main" style={{ minHeight: '60vh' }}>
        <BootSplash
          show={showBoot}
          onDone={handleBootDone}
          steps={[
            { label: 'Negotiating session…', ms: 300 },
            { label: 'Loading module…', ms: 450 },
            { label: 'Syncing cipher state…', ms: 480 },
            { label: 'Arming tools…', ms: 420 },
            { label: 'Ready.', ms: 260 },
          ]}
        />
      </div>
    );
  }

  // ACTIVE PUZZLE
  switch (puzzleType) {
    case 'sequence':
      return (
        <SequencePuzzle
          sessionId={null}
          layerId={null}
          layerData={{ difficulty: puzzleDifficulty }}
          onLocalPuzzleComplete={handleLocalPuzzleComplete}
        />
      );
    case 'frequencyTuning':
      return (
        <FrequencyPuzzle
          sessionId={null}
          layerId={null}
          layerData={{ difficulty: puzzleDifficulty }}
          onLocalPuzzleComplete={handleLocalPuzzleComplete}
        />
      );
    case 'logic':
      return (
        <LogicPuzzle
          sessionId={null}
          layerId={null}
          layerData={{ difficulty: puzzleDifficulty }}
          onLocalPuzzleComplete={handleLocalPuzzleComplete}
        />
      );
    case 'masterLock':
      return (
        <MasterLockPuzzle
          sessionId={null}
          layerId={null}
          layerData={{ difficulty: puzzleDifficulty }}
          onLocalPuzzleComplete={handleLocalPuzzleComplete}
        />
      );
    default:
      return (
        <div className="Quickhack-main" style={{ padding: '1rem' }}>
          Unknown puzzle type!
        </div>
      );
  }
}
