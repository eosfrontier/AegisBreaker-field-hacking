import { setFlag } from '../prefs/prefsStore';
import './styles/PuzzleBase.css';

const TutorialModal = ({
  isOpen,
  onClose,
  title = 'Quick Briefing',
  intro,
  bullets,
  body,
  ctaLabel = 'Got it',
  scope,
  dontShowAgainKey,
}) => {
  if (!isOpen) return null;

  const handleClose = () => {
    if (scope && dontShowAgainKey) {
      setFlag(scope, dontShowAgainKey, true);
    }
    onClose?.();
  };

  return (
    <div className="puzzle-modal-overlay" onClick={handleClose} role="dialog" aria-modal="true">
      <div className="puzzle-modal" onClick={(e) => e.stopPropagation()}>
        <h3 className="puzzle-modal-title">{title}</h3>
        {intro && <p className="puzzle-modal-body">{intro}</p>}
        {Array.isArray(bullets) && bullets.length > 0 && (
          <ul className="puzzle-modal-list">
            {bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        )}
        {body && <p className="puzzle-modal-body">{body}</p>}
        <button className="puzzle-button puzzle-button-block" onClick={handleClose} autoFocus>
          {ctaLabel}
        </button>
      </div>
    </div>
  );
};

export default TutorialModal;
