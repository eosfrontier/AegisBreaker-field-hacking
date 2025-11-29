import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAvailableSkills, getLabelById } from './skill-catalogue';
import { AiOutlineSetting } from 'react-icons/ai';
import BootSplash from '../common/BootSplash';

import './HomePage.css';

const FACTIONS = ['aquila', 'dugo', 'ekanesh', 'pendzal', 'sona'];

export default function HomePage() {
  const navigate = useNavigate();
  const modalRef = useRef(null);
  const lastFocusRef = useRef(null);

  const [info, setInfo] = useState(null); // {role,name,level,skills}
  const [showModal, setShowModal] = useState(false);

  const [step, setStep] = useState(0); // 0=role  1=operative-form
  const [, setRole] = useState(null); // 'admin' | 'operative'

  const [name, setName] = useState('');
  const [level, setLevel] = useState(1);
  const [levelInput, setLevelInput] = useState('1');
  const [skills, setSkills] = useState([]);
  const [faction, setFaction] = useState('');

  const [bootVisible, setBootVisible] = useState(() => {
    try {
      return !localStorage.getItem('ab:once:boot');
    } catch {
      return true;
    }
  });

  const openProfileModal = () => {
    if (info) {
      setName(info.name ?? '');
      const lv = info.level ?? 1;
      setLevel(lv);
      setLevelInput(String(lv));
      setSkills(info.skills ?? []);
      setRole(info.role ?? null);
      setFaction(info.faction ?? '');
      setStep(info.role === 'operative' ? 1 : 0);
    } else {
      setStep(0);
    }
    setShowModal(true);
  };

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

  useEffect(() => {
    if (showModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [showModal]);

  useEffect(() => {
    if (showModal) {
      lastFocusRef.current = document.activeElement;
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

  useEffect(() => {
    const f = info?.faction || faction || 'neutral';
    document.documentElement.setAttribute('data-faction', f);
    return () => {};
  }, [info?.faction, faction]);

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
      const filtered = prev.filter((id) => allowedIds.has(id));
      return filtered.slice(0, level);
    });
  }, [level, availableSkills]);

  const toggleSkill = (id) => {
    setSkills((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : pointsRemaining > 0 ? [...prev, id] : prev,
    );
  };

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
    setName('');
    setLevel(1);
    setLevelInput('1');
    setSkills([]);
    setRole(null);
    setStep(0);
    setShowModal(true);
    setFaction('');
  };

  return (
    <div className="main">
      {bootVisible && (
        <BootSplash
          show={bootVisible}
          onDone={() => {
            try {
              localStorage.setItem('ab:once:boot', '1');
            } catch {
              /* ignore */
            }
            setBootVisible(false);
          }}
          steps={[
            { label: 'AegisBreaker firmware v3.9', ms: 380 },
            { label: 'Routing via relay KST-7.', ms: 520 },
            { label: 'ICE signature handshake.', ms: 640 },
            { label: 'Entropy OK. Session keys derived', ms: 540 },
            { label: 'Standing by.', ms: 360 },
          ]}
        />
      )}
      <button className="qh-profile-btn" onClick={openProfileModal} aria-label="Edit profile">
        <AiOutlineSetting size={24} />
      </button>
      <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Aegis Breaker - Field hacking</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
        <button className="qh-btn" onClick={() => navigate('/quickhack')}>
          QuickHack
        </button>
        <button className="qh-btn" onClick={() => navigate('/qr-scanner')}>
          QR Scanner
        </button>
        <button className="qh-btn" onClick={() => navigate('/scripts-store')}>
          Scripts Store
        </button>
        {info?.role === 'admin' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', maxWidth: '260px' }}>
              <span style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Admin</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--card-border)' }} />
            </div>
            <button className="qh-btn" onClick={() => navigate('/gm-qr')}>
              Generate Puzzle QR
            </button>
            <button className="qh-btn" onClick={() => navigate('/admin')}>
              Admin Panel
            </button>
          </div>
        )}
      </div>

      {info?.role === 'operative' && (
        <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.9rem' }}>
          Logged in as <strong>{info.name}</strong> (Lv {info.level})<br />
          Skills: {info.skills.map(getLabelById).join(', ')}
        </div>
      )}

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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
              <h3 id="modalTitle" style={{ margin: 0, textAlign: 'center', flex: 1 }}>
                {step === 0 ? 'Identify Role' : 'Operative Profile'}
              </h3>
              <button
                className="qh-btn"
                style={{ background: '#b91c1c' }}
                onClick={handleRespec}
                aria-label="Respec / reset profile"
              >
                Reset
              </button>
            </div>
            <div style={{ maxHeight: '70vh', overflowX: 'hidden', paddingRight: '20px' }}>
              {step === 0 && (
                <>
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

              {step === 1 && (
                <>
                  <label className="qh-label">
                    Name <span style={{ color: '#f87171' }}>*</span>
                    <input
                      className="qh-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      aria-required="true"
                    />
                  </label>
                  <label className="qh-label">
                    Level (1-10) <span style={{ color: '#f87171' }}>*</span>
                    <input
                      className="qh-input"
                      type="number"
                      min="1"
                      max="10"
                      value={levelInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        // allow empty/partial input for easier typing
                        if (!/^[0-9]*$/.test(val)) return;
                        setLevelInput(val);
                        if (val === '') return;
                        const num = Number(val);
                        if (Number.isFinite(num)) {
                          const clamped = Math.max(1, Math.min(10, num));
                          setLevel(clamped);
                        }
                      }}
                      onBlur={() => setLevelInput(String(level))}
                      aria-required="true"
                    />
                  </label>

                  <div style={{ marginTop: '1rem' }}>
                    <h4 style={{ margin: 0, marginBottom: '.5rem' }}>
                      Faction <span style={{ color: '#f87171' }}>*</span>
                    </h4>
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
        </div>
      )}
    </div>
  );
}
