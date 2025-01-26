import QRCode from 'react-qr-code';
import './HexGrid.css';

function HexGrid({ layers, sessionId, variant = 'active' }) {
  // If variant === "preview", we hide puzzle details entirely
  const isPreview = variant === 'preview';
  return (
    <ul id="hexGrid" className={`${isPreview ? 'hex-preview' : ''}`}>
      {layers.map((layer) => {
        // Determine classes based on layer.status
        let statusClass = '';
        if (layer.status === 'IN_PROGRESS') {
          statusClass = 'in-progress';
        } else if (layer.status === 'SOLVED') {
          statusClass = 'solved';
        }

        return (
          <li className="hex" key={layer.id}>
            <div className={`hexIn ${statusClass} ${isPreview ? 'hex-preview' : ''}`}>
              <div className="hexLink">
                {isPreview ? (
                  // If we're in preview, show just a placeholder or blank
                  <span className="preview-placeholder">LOCKED</span>
                ) : layer.status !== 'SOLVED' ? (
                  <QRCode
                    value={`${window.location.origin}/puzzle/${sessionId}/${layer.id}`}
                    size={156}
                    bgColor="transparent"
                    fgColor="#ffffff" // Example neon green
                    type="M"
                  />
                ) : (
                  <span className="solved-overlay">Solved</span>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default HexGrid;
