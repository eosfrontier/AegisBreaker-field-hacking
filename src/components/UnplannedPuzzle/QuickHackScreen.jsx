import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

import UnlockedLockSVG from '../../assets/lock-unlock-icon-22.svg';
import './QuickHackScreen.css';

// Import puzzles you want to support
import SequencePuzzle from '../Puzzle/SequencePuzzle';
import FrequencyPuzzle from '../Puzzle/FrequencyPuzzle';
import LogicPuzzle from '../Puzzle/LogicPuzzle';
import MasterLockPuzzle from '../Puzzle/MasterLockPuzzle';
// ...add more puzzle imports here as needed...

// Tools (puzzles) we can offer
const PUZZLE_TOOLS = [
  { type: 'sequence', label: 'Sequencer' },
  { type: 'frequencyTuning', label: 'Frequency Tuner' },
  { type: 'logic', label: 'Logic Sifter' },
  { type: 'masterLock', label: 'Lock Picker' },
  // Add more puzzle tools here
];

// Difficulty labels
const DIFFICULTY_LABELS = {
  1: 'Basic',
  2: 'Intermediate',
  3: 'Complex',
  4: 'Intricate',
  5: 'Inscrutable',
};

function QuickHackScreen() {
  const [selectedTool, setSelectedTool] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // e.g. /QuickHack?type=sequence&difficulty=3
  const puzzleType = searchParams.get('type');
  const puzzleDifficulty = searchParams.get('difficulty');

  // Track if puzzle is solved locally (no Firestore in this flow)
  const [localPuzzleSolved, setLocalPuzzleSolved] = useState(false);

  // Callback for when the puzzle is solved
  const handleLocalPuzzleComplete = () => {
    setLocalPuzzleSolved(true);
  };

  const handleStartPuzzle = () => {
    // Only navigate if we have both selected
    if (selectedTool && selectedDifficulty) {
      navigate(`/QuickHack?type=${selectedTool}&difficulty=${selectedDifficulty}`);
    }
  };

  if (!puzzleType && !puzzleDifficulty) {
    // Show the "start screen"
    return (
      <div className="Quickhack-main">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          {/* Left Column: Tool Selection */}
          <div style={{ marginRight: '1rem' }}>
            <h2 style={{ minHeight: '72px' }}>Select Tool</h2>
            <div style={{ display: 'flex', flexDirection: 'column', float: 'left' }}>
              {PUZZLE_TOOLS.map((tool) => (
                <button
                  key={tool.type}
                  onClick={() => setSelectedTool(tool.type)}
                  style={{
                    display: 'block',
                    margin: '0.5rem 0',
                    padding: '0.5rem 1rem',
                    backgroundColor: selectedTool === tool.type ? '#4d5356' : '#222426',
                    cursor: 'pointer',
                    border: '1px solid #999',
                  }}
                >
                  {tool.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right Column: Difficulty Selection */}
          <div style={{ textAlign: 'right' }}>
            <h2>Select Defense Quality</h2>
            <div style={{ display: 'flex', flexDirection: 'column', float: 'right' }}>
              {Object.entries(DIFFICULTY_LABELS).map(([num, label]) => (
                <button
                  key={num}
                  onClick={() => setSelectedDifficulty(num)}
                  style={{
                    display: 'block',
                    margin: '0.5rem 0',
                    padding: '0.5rem 1rem',
                    backgroundColor: selectedDifficulty === num ? '#4d5356' : '#222426',
                    cursor: 'pointer',
                    border: '1px solid #999',
                    width: '120px',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {/* Start Puzzle Button */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            flexDirection: 'column',
            alignContent: 'center',
            alignItems: 'center',
          }}
        >
          <h2>Run Program</h2>
          <button
            disabled={!selectedTool || !selectedDifficulty}
            onClick={handleStartPuzzle}
            style={{
              padding: '1rem 2rem',
              backgroundColor: !selectedTool || !selectedDifficulty ? '#999' : '#00aa00',
              color: '#fff',
              cursor: !selectedTool || !selectedDifficulty ? 'not-allowed' : 'pointer',
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

  // If puzzle is solved, show a "solved" screen
  if (localPuzzleSolved) {
    return (
      <div
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
          src={UnlockedLockSVG}
          alt="Unlocked lock"
          className="Unlocked-lock"
          style={{
            width: '230px',
            height: '280px',
          }}
        />
        <button onClick={() => navigate('/')}>Close connection</button>
      </div>
    );
  }

  // Otherwise, render puzzle by type
  // Pass in layerData with just a difficulty key, plus the callback
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

    // Add more puzzle types here
    // case "logic":
    //   ...

    default:
      return <div>Unknown puzzle type!</div>;
  }
}

export default QuickHackScreen;
