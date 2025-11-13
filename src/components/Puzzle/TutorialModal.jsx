import { setFlag } from '../prefs/prefsStore';
import './LogicPuzzle.css';

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
    <div className="ls-modal-overlay" onClick={handleClose} role="dialog" aria-modal="true">
      <div className="ls-modal-card" onClick={(e) => e.stopPropagation()}>
        <h3 className="ls-modal-title">{title}</h3>
        {intro && <p className="ls-modal-body">{intro}</p>}
        {Array.isArray(bullets) && bullets.length > 0 && (
          <ul className="ls-modal-list">
            {bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        )}
        {body && <p className="ls-modal-body">{body}</p>}
        <button className="validate-button" onClick={handleClose} autoFocus>
          {ctaLabel}
        </button>
      </div>
    </div>
  );
};

export default TutorialModal;
