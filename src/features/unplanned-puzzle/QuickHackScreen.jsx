// components/UnplannedPuzzle/QuickHackScreen.jsx
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './QuickHackScreen.css';
import { DIFFICULTY_LABELS, PUZZLE_TOOLS } from './puzzleOptions';

export default function QuickHackScreen() {
  const [selectedTool, setSelectedTool] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [step, setStep] = useState(0); // 0=tool, 1=difficulty

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
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '0.5rem' }}>
        <button
          className="home-nav-btn"
          onClick={() =>
            navigate('/', {
              state: { transition: { direction: 'from-left' } },
            })
          }
          style={{ minWidth: '50px', width: '100px' }}
        >
          Back
        </button>
      </div>
      <div className="qh-stepper">
        <span className={step === 0 ? 'active' : ''}>Tool</span>
        <span className={step === 1 ? 'active' : ''}>Difficulty</span>
      </div>

      <div className="qh-slider-viewport">
        <div className="qh-slider" style={{ transform: `translateX(-${step * 50}%)` }}>
          {/* Step 0: Tool selection */}
          <div className="qh-slide">
            <h2>Select Tool</h2>
            <div className="qh-tile-grid">
              {PUZZLE_TOOLS.map((tool) => (
                <button
                  key={tool.type}
                  onClick={() => setSelectedTool(tool.type)}
                  className={`qh-btn hud-btn ${selectedTool === tool.type ? 'selected' : ''}`}
                >
                  <span className="hud-btn-label">{tool.label}</span>
                </button>
              ))}
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="qh-btn hud-btn"
                disabled={!selectedTool}
                onClick={() => setStep(1)}
                style={{ minWidth: '160px' }}
              >
                Next
              </button>
            </div>
          </div>

          {/* Step 1: Difficulty */}
          <div className="qh-slide">
            <h2>Select Defense Quality</h2>
            <p style={{ marginTop: '-4px', opacity: 0.8 }}>
              Tool: <strong>{PUZZLE_TOOLS.find((t) => t.type === selectedTool)?.label || 'None'}</strong>
            </p>
            <div className="qh-tile-grid">
              {Object.entries(DIFFICULTY_LABELS).map(([num, label]) => (
                <button
                  key={num}
                  onClick={() => setSelectedDifficulty(num)}
                  className={`qh-btn hud-btn ${String(selectedDifficulty) === num ? 'selected' : ''}`}
                >
                  <span className="hud-btn-label">{label}</span>
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem' }}>
              <button className="qh-btn hud-btn secondary" onClick={() => setStep(0)}>
                Back
              </button>
              <button
                className="qh-btn hud-btn"
                disabled={!selectedTool || !selectedDifficulty}
                onClick={handleStartPuzzle}
                style={{ minWidth: '160px' }}
              >
                Engage
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
