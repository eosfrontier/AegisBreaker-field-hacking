import { useMemo, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import './QuickHackScreen.css';
import { DIFFICULTY_LABELS, PUZZLE_TOOLS } from '../puzzles/common/puzzleRegistry';

const DEFAULT_SOLVED_TITLE = 'Access granted';
const DEFAULT_SOLVED_SUBTITLE = 'ICE layer neutralized. Data channel is stable.';

export default function GmQrGenerator() {
  const [selectedTool, setSelectedTool] = useState(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState(null);
  const [completionTitle, setCompletionTitle] = useState('');
  const [completionSubtitle, setCompletionSubtitle] = useState('');
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const qrValue = useMemo(() => {
    if (!selectedTool || !selectedDifficulty) return '';
    const params = new URLSearchParams({ type: selectedTool, difficulty: selectedDifficulty });
    if (completionTitle.trim()) params.set('title', completionTitle.trim());
    if (completionSubtitle.trim()) params.set('subtitle', completionSubtitle.trim());
    return `${window.location.origin}/puzzle?${params.toString()}`;
  }, [selectedTool, selectedDifficulty, completionTitle, completionSubtitle]);

  const handleShowModal = () => {
    if (!qrValue) return;
    setShowModal(true);
  };

  const handleCloseModal = () => setShowModal(false);

  return (
    <div className="main" style={{ padding: '16px', margin: '0 auto', maxWidth: '720px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '0.5rem' }}>
        <button className="qh-btn secondary" onClick={() => navigate('/')} style={{ minWidth: '120px' }}>
          Back
        </button>
      </div>
      <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>GM Puzzle QR</h2>
      <p style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        Pick a puzzle and difficulty, then pop open the QR when you are ready to hand it to players.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <div>
          <h3 style={{ minHeight: '52px' }}>Puzzle Type</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {PUZZLE_TOOLS.map((tool) => (
              <button
                key={tool.type}
                onClick={() => setSelectedTool(tool.type)}
                className="qh-btn"
                style={{
                  justifyContent: 'flex-start',
                  background: selectedTool === tool.type ? '#4d5356' : 'var(--surface-2)',
                  border: '1px solid var(--card-border)',
                }}
              >
                {tool.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3>Difficulty</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Object.entries(DIFFICULTY_LABELS).map(([num, label]) => (
              <button
                key={num}
                onClick={() => setSelectedDifficulty(num)}
                className="qh-btn"
                style={{
                  justifyContent: 'flex-start',
                  background: String(selectedDifficulty) === num ? '#4d5356' : 'var(--surface-2)',
                  border: '1px solid var(--card-border)',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1rem',
        }}
      >
        <label className="qh-label">
          Solved Title (optional)
          <input
            className="qh-input"
            value={completionTitle}
            placeholder={DEFAULT_SOLVED_TITLE}
            onChange={(e) => setCompletionTitle(e.target.value)}
          />
        </label>
        <label className="qh-label">
          Solved Subtitle (optional)
          <input
            className="qh-input"
            value={completionSubtitle}
            placeholder={DEFAULT_SOLVED_SUBTITLE}
            onChange={(e) => setCompletionSubtitle(e.target.value)}
          />
        </label>
      </div>

      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center' }}>
        <button className="qh-btn" disabled={!qrValue} onClick={handleShowModal} style={{ minWidth: '180px' }}>
          {qrValue ? 'Open QR Modal' : 'Select puzzle + difficulty'}
        </button>
      </div>

      {showModal && qrValue && (
        <div className="qh-modal-overlay-qr" onClick={handleCloseModal} aria-hidden="true">
          <div
            className="qh-modal-qr"
            role="dialog"
            aria-modal="true"
            aria-label="Generated puzzle QR"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '420px' }}
          >
            <h3 style={{ marginTop: 0, textAlign: 'center' }}>Puzzle QR</h3>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
              <QRCodeCanvas value={qrValue} size={240} bgColor="#000" fgColor="#fff" level="H" />
              <code style={{ fontSize: '0.85rem', wordBreak: 'break-all', textAlign: 'center' }}>{qrValue}</code>
              <button className="qh-btn" onClick={handleCloseModal} style={{ minWidth: '120px' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
