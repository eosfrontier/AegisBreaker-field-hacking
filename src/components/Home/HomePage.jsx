import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAvailableSkills, getLabelById } from './skill-catalogue';
import { AiOutlineSetting } from 'react-icons/ai';
import BootSplash from './BootSplash';

import './HomePage.css';

const FACTIONS = ['aquila', 'dugo', 'ekanesh', 'pendzal', 'sona'];

export default function HomePage() {
  const navigate = useNavigate();
  const modalRef = useRef(null);
  const lastFocusRef = useRef(null);

  // persistent data ―——————————————————————————————————————————————————
  const [info, setInfo] = useState(null); // {role,name,level,skills}
  const [showModal, setShowModal] = useState(false);

  // modal step state ―———————————————————————————————————————————————
  const [step, setStep] = useState(0); // 0=role  1=operative-form
  const [, setRole] = useState(null); // 'admin' | 'operative'

  const [name, setName] = useState('');
  const [level, setLevel] = useState(1);
  const [skills, setSkills] = useState([]);
  const [faction, setFaction] = useState('');

  const [bootShown, setBootShown] = useState(() => {
    try {
      return !!localStorage.getItem('ab:once:boot');
    } catch {
      return false;
    }
  });

  const openProfileModal = () => {
    if (info) {
      setName(info.name ?? '');
      setLevel(info.level ?? 1);
      setSkills(info.skills ?? []);
      setRole(info.role ?? null);
      setFaction(info.faction ?? '');
      setStep(info.role === 'operative' ? 1 : 0); // jump to details for operative
    } else {
      setStep(0);
    }
    setShowModal(true);
  };

  // on mount → load / decide whether to open modal
  useEffect(() => {
    const stored = localStorage.getItem('characterInfo');
    if (stored) {
      const parsed = JSON.parse(stored);
      setInfo(parsed);
      if (parsed.faction) setFaction(parsed.faction);
    } else {
      setShowModal(true);
    }
  }, []);

  // lock page scroll while modal is open
  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [showModal]);

  // move focus into modal on open; restore to trigger on close
  useEffect(() => {
    if (showModal) {
      lastFocusRef.current = document.activeElement;
      // wait a tick for content to render
      setTimeout(() => {
        const firstFocusable = modalRef.current?.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        firstFocusable?.focus();
      }, 0);
    } else {
      lastFocusRef.current?.focus?.();
    }
  }, [showModal]);

  // apply theme attribute to <html> (or <body>) whenever faction changes
  useEffect(() => {
    const f = info?.faction || faction || 'neutral';
    document.documentElement.setAttribute('data-faction', f);
    return () => {
      /* no-op */
    };
  }, [info?.faction, faction]);

  // ESC to close  simple focus trap for Tab/ShiftTab
  useEffect(() => {
    if (!showModal) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        return;
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [showModal]);

  const availableSkills = useMemo(() => getAvailableSkills(level), [level]);
  const pointsRemaining = level - skills.length;

  useEffect(() => {
    const allowedIds = new Set(availableSkills.map((s) => s.id));
    setSkills((prev) => {
      // keep only skills still allowed at this level
      const filtered = prev.filter((id) => allowedIds.has(id));
      // enforce "points = level"
      return filtered.slice(0, level);
    });
  }, [level, availableSkills]);

  const toggleSkill = (id) => {
    setSkills((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : pointsRemaining > 0 ? [...prev, id] : prev,
    );
  };

  // save operative profile now requires a faction
  const saveOperative = () => {
    if (!name || !faction) return;
    const data = {
      role: 'operative',
      name,
      level,
      skills,
      faction,
    };
    localStorage.setItem('characterInfo', JSON.stringify(data));
    setInfo(data);
    setShowModal(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setStep(0);
  };

  const handleRespec = () => {
    localStorage.removeItem('characterInfo');
    setInfo(null);
    // reset modal state
    setName('');
    setLevel(1);
    setSkills([]);
    setRole(null);
    setStep(0);
    setShowModal(true);
    setFaction('');
  };

  // ──────────────────────────────────────────────────────────────────
  return (
    <div className="main">
      <BootSplash
        show={!bootShown}
        persistKey="ab:once:boot"
        onDone={() => setBootShown(true)}
        steps={[
          { label: 'AegisBreaker firmware v3.9', ms: 380 },
          { label: 'Routing via relay KST-7…', ms: 520 },
          { label: 'ICE signature handshake…', ms: 640 },
          { label: 'Entropy OK • Session keys derived', ms: 540 },
          { label: 'Standing by.', ms: 360 },
        ]}
      />
      <button className="qh-profile-btn" onClick={openProfileModal} aria-label="Edit profile">
        <AiOutlineSetting size={24} />
      </button>
      <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Aegis Breaker — Field hacking</h2>

      {/* Navigation buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
        <button className="qh-btn" onClick={() => navigate('/quickhack')}>
          QuickHack
        </button>
        <button className="qh-btn" onClick={() => navigate('/qr-scanner')}>
          QR Scanner
        </button>
        {info?.role === 'admin' && (
          <button className="qh-btn" onClick={() => navigate('/admin')}>
            Admin Panel
          </button>
        )}
      </div>

      {/* Character summary */}
      {info?.role === 'operative' && (
        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
          Logged in as <strong>{info.name}</strong> (Lv {info.level})<br />
          Skills: {info.skills.map(getLabelById).join(', ')}
        </div>
      )}

      {info && (
        <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
          <button className="qh-btn" onClick={handleRespec}>
            Respec / Change Role
          </button>
        </div>
      )}

      {/* ────── Modal ────── */}
      {showModal && (
        <div className="qh-modal-overlay" onClick={closeModal} aria-hidden="true">
          <div
            className="qh-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modalTitle"
            onClick={(e) => e.stopPropagation()}
            ref={modalRef}
          >
            <button className="qh-modal-close" aria-label="Close dialog" onClick={closeModal}>
              ×
            </button>
            {/* STEP 0 – choose role */}
            {step === 0 && (
              <>
                <h3 id="modalTitle" style={{ textAlign: 'center' }}>
                  Identify Role
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                  <button
                    className="qh-btn"
                    onClick={() => {
                      setRole('operative');
                      setStep(1);
                    }}
                  >
                    Operative (Player)
                  </button>
                  <button
                    className="qh-btn"
                    onClick={() => {
                      const data = { role: 'admin' };
                      localStorage.setItem('characterInfo', JSON.stringify(data));
                      setInfo(data);
                      closeModal();
                    }}
                  >
                    Administrator (GM)
                  </button>
                </div>
              </>
            )}

            {/* STEP 1 – operative form */}
            {step === 1 && (
              <>
                <h3 id="modalTitle" style={{ textAlign: 'center' }}>
                  Operative Profile
                </h3>
                {/* Name & level */}
                <label className="qh-label">
                  Name
                  <input className="qh-input" value={name} onChange={(e) => setName(e.target.value)} required />
                </label>
                <label className="qh-label">
                  Level (1-10)
                  <input
                    className="qh-input"
                    type="number"
                    min="1"
                    max="10"
                    value={level}
                    onChange={(e) => {
                      const v = Math.max(1, Math.min(10, Number(e.target.value)));
                      setLevel(v);
                      setSkills([]); // reset skills when level changes
                    }}
                  />
                </label>

                <div style={{ marginTop: '1rem' }}>
                  <h4 style={{ margin: 0, marginBottom: '.5rem' }}>Faction (required)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
                    {FACTIONS.map((f) => {
                      const label = f.charAt(0).toUpperCase() + f.slice(1);
                      const isActive = faction === f;
                      return (
                        <button
                          key={f}
                          type="button"
                          className="qh-card qh-btn secondary qh-focus"
                          onClick={() => setFaction(f)}
                          aria-pressed={isActive}
                          style={{
                            padding: '.75rem',
                            borderColor: isActive ? 'var(--accent-2)' : 'var(--card-border)',
                          }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Skills */}
                <div style={{ marginTop: '1rem' }}>
                  <p style={{ marginBottom: '0.25rem', fontSize: '0.9rem' }}>
                    Select skills ({pointsRemaining} pts left)
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {availableSkills.map(({ id, label }) => (
                      <button
                        key={id}
                        onClick={() => toggleSkill(id)}
                        className="qh-skill-btn"
                        style={{
                          backgroundColor: skills.includes(id) ? '#4d5356' : '#222426',
                          cursor: pointsRemaining > 0 || skills.includes(id) ? 'pointer' : 'not-allowed',
                          opacity: pointsRemaining > 0 || skills.includes(id) ? 1 : 0.5,
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Save / back */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1.5rem' }}>
                  <button className="qh-btn" onClick={closeModal}>
                    Close
                  </button>
                  <button
                    className="qh-btn"
                    disabled={!name || !faction}
                    style={{ backgroundColor: !name ? '#666' : '#00aa00' }}
                    onClick={saveOperative}
                  >
                    Save&nbsp;Profile
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
