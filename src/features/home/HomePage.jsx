import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAvailableSkills, getLabelById } from './skill-catalogue';
import { AiOutlineUser } from 'react-icons/ai';
import BootSplash from '../../components/common/BootSplash';
import { getAuthMode, getReturnUrl, useJoomlaSession } from '../../auth/JoomlaSessionContext';
import { loadCloudProfile, useCharacterImport } from '../../auth/useCharacterImport';
import { motion, AnimatePresence } from 'motion/react';

import './HomePage.css';

const FACTIONS = ['aquila', 'dugo', 'ekanesh', 'pendzal', 'sona'];

export default function HomePage() {
  const navigate = useNavigate();
  const { isAdmin, isLoggedIn, status, grantMockAdmin } = useJoomlaSession();
  const authMode = getAuthMode();
  const returnUrl = getReturnUrl();
  const modalRef = useRef(null);
  const lastFocusRef = useRef(null);
  const initRef = useRef(false);

  const [info, setInfo] = useState(null); // {role,name,level,skills}
  const [cloudProfile, setCloudProfile] = useState(() => loadCloudProfile());
  const [showModal, setShowModal] = useState(false);

  const [step, setStep] = useState(0); // 0=role  1=operative-form
  const [, setRole] = useState(null); // 'admin' | 'operative'

  const [name, setName] = useState('');
  const [level, setLevel] = useState(1);
  const [levelInput, setLevelInput] = useState('1');
  const [skills, setSkills] = useState([]);
  const [faction, setFaction] = useState('');
  const { importProfile, status: importStatus, error: importError } = useCharacterImport();

  const [bootVisible, setBootVisible] = useState(() => {
    try {
      return !localStorage.getItem('ab:once:boot');
    } catch {
      return true;
    }
  });

  const hasChosenRole = useMemo(() => {
    try {
      const storedRole = localStorage.getItem('ab:user-type');
      return info?.role === 'operative' || storedRole === 'operative';
    } catch {
      return info?.role === 'operative';
    }
  }, [info?.role]);

  const openProfileModal = () => {
    // toggle if already open
    if (showModal) {
      closeModal();
      return;
    }
    if (info?.role === 'operative') {
      setName(info.name ?? '');
      const lv = info.level ?? 1;
      setLevel(lv);
      setLevelInput(String(lv));
      setSkills(info.skills ?? []);
      setRole(info.role ?? null);
      setFaction(info.faction ?? '');
      setStep(1);
    } else {
      setStep(hasChosenRole ? 1 : 0);
    }
    setShowModal(true);
  };

  useEffect(() => {
    if (initRef.current) return;
    if (status === 'loading' || status === 'idle') return;

    const stored = localStorage.getItem('characterInfo');
    if (stored) {
      const parsed = JSON.parse(stored);
      setInfo(parsed);
      if (parsed.faction) setFaction(parsed.faction);
      initRef.current = true;
      return;
    }

    if (authMode === 'joomla' && isLoggedIn) {
      const role = isAdmin ? 'admin' : 'operative';
      try {
        localStorage.setItem('ab:user-type', role);
      } catch {
        /* ignore */
      }
      if (isAdmin) {
        const data = { role: 'admin' };
        localStorage.setItem('characterInfo', JSON.stringify(data));
        setInfo(data);
      }
      initRef.current = true;
      return;
    }

    if (cloudProfile) {
      initRef.current = true;
      return;
    }

    setShowModal(true);
    initRef.current = true;
  }, [authMode, isLoggedIn, isAdmin, status, cloudProfile]);

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

  const handleJoomlaLogin = () => {
    if (authMode === 'mock') {
      grantMockAdmin?.();
      const data = { role: 'admin' };
      try {
        localStorage.setItem('ab:user-type', 'admin');
        localStorage.setItem('characterInfo', JSON.stringify(data));
      } catch {
        /* ignore */
      }
      setInfo(data);
      setShowModal(false);
      return;
    }
    if (returnUrl) {
      window.location.assign(returnUrl);
    }
  };

  const handleImportProfile = async () => {
    try {
      const imported = await importProfile();
      if (imported) {
        setCloudProfile(imported);
        setShowModal(false);
      }
    } catch {
      /* handled by importError */
    }
  };

  const isImporting = importStatus === 'loading';
  const importMessage =
    importError?.code === 'not_logged_in'
      ? 'Please log into Joomla to import character.'
      : importError
        ? 'Unable to import character profile. Please try again.'
        : '';

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
    try {
      localStorage.removeItem('ab:user-type');
    } catch {
      /* ignore */
    }
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
      <motion.button
        className="qh-profile-btn"
        onClick={openProfileModal}
        aria-label="Edit profile"
        whileTap={{ scale: 0.92, rotate: -6 }}
        whileHover={{ scale: 1.06 }}
        transition={{ type: 'spring', stiffness: 420, damping: 18 }}
      >
        <AiOutlineUser size={24} />
      </motion.button>
      <h2 style={{ textAlign: 'center', marginBottom: '1rem', fontWeight: '700', fontFamily: 'var(--faction-font)' }}>
        [ Aegis Breaker ]
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
        <button
          className="qh-btn home-nav-btn"
          onClick={() =>
            navigate('/QuickHack', {
              state: { transition: { direction: 'from-right' } },
            })
          }
        >
          QuickHack
        </button>
        <button
          className="qh-btn home-nav-btn"
          onClick={() =>
            navigate('/qr-scanner', {
              state: { transition: { direction: 'from-left' } },
            })
          }
        >
          QR Scanner
        </button>
        <button
          className="qh-btn home-nav-btn"
          onClick={() =>
            navigate('/scripts-store', {
              state: { transition: { direction: 'from-bottom' } },
            })
          }
        >
          Scripts Store
        </button>
        {isAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', maxWidth: '260px' }}>
              <span style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Admin</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--card-border)' }} />
            </div>
            <button className="qh-btn home-nav-btn" onClick={() => navigate('/gm-qr')}>
              Generate Puzzle QR
            </button>
            <button className="qh-btn home-nav-btn" onClick={() => navigate('/admin')}>
              Admin Panel
            </button>
            <button className="qh-btn home-nav-btn" onClick={() => navigate('/admin/feedback')}>
              Feedback Dashboard
            </button>
          </div>
        )}
      </div>

      {cloudProfile && (
        <div className="profile-chip">
          <div className="profile-chip-header">
            <span className="profile-chip-label">Welcome</span>
            <span className="profile-chip-name">{cloudProfile.displayName || cloudProfile.characterName}</span>
          </div>
          <div className="profile-chip-meta">
            <span>Faction: {cloudProfile.faction || 'unknown'}</span>
            <span className="profile-chip-divider" aria-hidden="true">
              |
            </span>
            <span>IT: {Number.isFinite(cloudProfile.itLevel) ? cloudProfile.itLevel : 0}</span>
          </div>
        </div>
      )}

      {info?.role === 'operative' && (
        <div className="profile-chip">
          <div className="profile-chip-header">
            <span className="profile-chip-label">Operative</span>
            <span className="profile-chip-name">{info.name}</span>
          </div>
          <div className="profile-chip-meta">
            <span className="profile-chip-level">LV {info.level}</span>
            <span className="profile-chip-divider" aria-hidden="true">
              •
            </span>
            <span className="profile-chip-skills">
              {info.skills.map(getLabelById).join(', ') || 'No skills selected'}
            </span>
          </div>
        </div>
      )}

      <AnimatePresence initial={false} mode="wait">
        {showModal && (
          <motion.div
            className="qh-modal-overlay"
            onClick={closeModal}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="qh-modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="modalTitle"
              onClick={(e) => e.stopPropagation()}
              ref={modalRef}
              initial={{ y: 24, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 360, damping: 26 }}
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
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1rem',
                        marginTop: '1rem',
                      }}
                    >
                      <button
                        className="qh-btn home-nav-btn"
                        onClick={() => {
                          try {
                            localStorage.setItem('ab:user-type', 'operative');
                          } catch {
                            /* ignore */
                          }
                          setRole('operative');
                          setStep(1);
                        }}
                      >
                        Operative (Player)
                      </button>
                      {(authMode === 'joomla' && isLoggedIn) || authMode === 'mock' ? (
                        <button className="qh-btn home-nav-btn" onClick={handleImportProfile} disabled={isImporting}>
                          {isImporting ? 'Importing...' : 'Import Character Profile'}
                        </button>
                      ) : null}
                      {authMode !== 'none' && !isLoggedIn && (
                        <button className="qh-btn home-nav-btn" onClick={handleJoomlaLogin}>
                          Login to Joomla
                        </button>
                      )}
                      {importMessage ? (
                        <div style={{ fontSize: '0.9rem', color: '#fca5a5', textAlign: 'center' }}>{importMessage}</div>
                      ) : null}
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
                          const digits = e.target.value.replace(/\D/g, '');
                          if (!digits) {
                            setLevelInput('');
                            return;
                          }
                          const normalized = digits.startsWith('10') ? '10' : digits.slice(-1);
                          const num = Number(normalized);
                          if (!Number.isFinite(num) || num < 1) return;
                          const clamped = Math.min(10, num);
                          setLevel(clamped);
                          setLevelInput(String(clamped));
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
