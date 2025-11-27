// components/UnplannedPuzzle/QuickHackScreen.jsx
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './QuickHackScreen.css';
import { DIFFICULTY_LABELS, PUZZLE_TOOLS } from './puzzleOptions';

export default function QuickHackScreen() {
  const [selectedTool, setSelectedTool] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const puzzleType = searchParams.get('type');
  const puzzleDifficulty = searchParams.get('difficulty');

  // Redirect legacy query deep links to the unified puzzle route
  useEffect(() => {
    if (puzzleType && puzzleDifficulty) {
      navigate(`/puzzle?type=${puzzleType}&difficulty=${puzzleDifficulty}`, { replace: true });
    }
  }, [puzzleType, puzzleDifficulty, navigate]);

  const handleStartPuzzle = () => {
    if (!selectedTool || !selectedDifficulty) return;
    navigate(`/puzzle?type=${selectedTool}&difficulty=${selectedDifficulty}`);
  };

  return (
    <div className="main" style={{ padding: '16px', margin: '0 auto' }}>
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
