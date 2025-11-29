import { useMemo } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import './DefenseGrid.css';

const PUZZLE_TYPE_META = {
  sequence: { label: 'Sequence', badge: 'SEQ' },
  frequencyTuning: { label: 'Frequency', badge: 'FQ' },
  logic: { label: 'Logic', badge: 'LOG' },
  masterLock: { label: 'Circle Lock', badge: 'CLK' },
};

const STATUS_COPY = {
  IN_PROGRESS: 'In progress',
  SOLVED: 'Solved',
  LOCKED: 'Locked',
};

function DefenseGrid({ layers, sessionId, variant = 'active' }) {
  const isPreview = variant === 'preview';

  const preparedLayers = useMemo(
    () =>
      layers.map((layer) => {
        const meta = PUZZLE_TYPE_META[layer.puzzleType] || { label: 'Unknown', badge: 'UNK' };
        const difficulty = Math.max(1, Math.min(Number(layer.difficulty) || 1, 5));
        const status = isPreview ? 'LOCKED' : layer.status || 'IDLE';
        const name =
          layer.shortId || (layer.id ? layer.id.slice(0, 4).toUpperCase() : 'NODE');
        const qrValue = `${window.location.origin}/puzzle/${sessionId}/${layer.id}`;
        return {
          ...layer,
          meta,
          difficulty,
          status,
          name,
          qrValue,
        };
      }),
    [isPreview, layers, sessionId],
  );

  return (
    <div className="defense-grid">
      {preparedLayers.map((layer) => {
        const statusClass = `status-${layer.status.toLowerCase()}`;
        return (
          <div className={`defense-tile ${statusClass}`} key={layer.id}>
            <div className="tile-rail" />
            <div className="tile-body">
              <div className="tile-qr">
                {isPreview ? (
                  <div className="qr-locked">LOCKED</div>
                ) : (
                  <>
                    <QRCodeCanvas
                      value={layer.qrValue}
                      size={164}
                      bgColor="#0b0f16"
                      fgColor="#ffffff"
                      level="L"
                      marginSize={1}
                    />
                    {layer.status === 'SOLVED' && <div className="qr-mask">SOLVED</div>}
                  </>
                )}
              </div>
              <div className="tile-info">
                <div className="tile-top-row">
                  <div className="tile-name">DEF {layer.name}</div>
                  <div className="type-chip">
                    <span className="type-badge">{layer.meta.badge}</span>
                    <span className="type-label">{layer.meta.label}</span>
                  </div>
                </div>
                <div className="tile-middle-row">
                  <div className="difficulty-row" aria-label={`Difficulty ${layer.difficulty}`}>
                    {Array.from({ length: layer.difficulty }).map((_, idx) => (
                      <span key={idx} className="pip-dot" />
                    ))}
                  </div>
                </div>
                <div className="tile-bottom-row">
                  <span className="status-label">
                    {STATUS_COPY[layer.status] || 'Idle'}
                  </span>
                  {layer.claimedBy && layer.status === 'IN_PROGRESS' && (
                    <span className="claimed-by">Claimed by {layer.claimedBy}</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default DefenseGrid;
