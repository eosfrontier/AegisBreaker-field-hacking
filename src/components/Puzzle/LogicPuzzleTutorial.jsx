import './LogicSifter.css';

const TutorialModal = ({ onClose }) => {
  return (
    <div className="ls-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="ls-modal-card" onClick={(e) => e.stopPropagation()}>
        <h3 className="ls-modal-title">Logic Sifter — Quick Briefing</h3>
        <p className="ls-modal-body">
          Your goal is to identify which modules are <strong>Harmless</strong> and which are{' '}
          <strong>Security/Hostile</strong>.
        </p>
        <ul className="ls-modal-list">
          <li>
            Statements by <strong>Harmless</strong> modules are always <em>true</em>.
          </li>
          <li>
            Statements by <strong>Security/Hostile</strong> modules are always <em>false</em>.
          </li>
          <li>
            Follow the visible <strong>Subsystem Rules</strong> (e.g., “Exactly one Security module”).
          </li>
        </ul>
        <p className="ls-modal-body">
          If you have the <strong>Scan</strong> script, you can <em>Check Contradictions</em> to mark statements that
          conflict with your current labels. It spends one charge.
        </p>
        <button className="validate-button" onClick={onClose} autoFocus>
          Got it
        </button>
      </div>
    </div>
  );
};

export default TutorialModal;
