import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAvailableSkills, getLabelById } from './skill-catalogue';
import { AiOutlineUser } from 'react-icons/ai';
import BootSplash from '../../components/common/BootSplash';
import { getAuthMode, getReturnUrl, useJoomlaSession } from '../../auth/JoomlaSessionContext';
import { useOrthancImport } from '../../hooks/useOrthancImport';
import { motion, AnimatePresence } from 'motion/react';

import './HomePage.css';

const FACTIONS = ['Aquila', 'Dugo', 'Ekanesh', 'Pendzal', 'Sona'];
const PENDING_CLOUD_IMPORT_KEY = 'ab:pending-cloud-import';

const normalizeFaction = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const match = FACTIONS.find((factionName) => factionName.toLowerCase() === raw.toLowerCase());
  return match ?? '';
};

const readCharacterInfo = () => {
  try {
    const stored = localStorage.getItem('characterInfo');
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') return null;

    const normalizedFaction = normalizeFaction(parsed.faction);
    if (normalizedFaction) parsed.faction = normalizedFaction;

    if (parsed.profile?.cloud) {
      const normalizedCloudFaction = normalizeFaction(parsed.profile.cloud.faction);
      if (normalizedCloudFaction) parsed.profile.cloud.faction = normalizedCloudFaction;
    }

    return parsed;
  } catch {
    return null;
  }
};
const clampLevel = (value, min = 0, max = 10) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
};

const mergeCloudProfile = (profile, cloud) => {
  const base = profile && typeof profile === 'object' ? profile : {};
  const next = { ...base, cloud };
  if (!next.role) {
    next.role = 'operative';
  }
  return next;
};

export default function HomePage() {
  const navigate = useNavigate();
  const { isAdmin, isLoggedIn, status, grantMockAdmin, joomlaId } = useJoomlaSession();
  const authMode = getAuthMode();
  const returnUrl = getReturnUrl();
  const { importCharacter, loading: importLoading, error: importError } = useOrthancImport();
  const modalRef = useRef(null);
  const lastFocusRef = useRef(null);
  const initRef = useRef(false);

  const [info, setInfo] = useState(null); // {role,name,level,skills}
  const [showModal, setShowModal] = useState(false);

  const [step, setStep] = useState(0); // 0=profile-source  1=operative-form
  const [, setRole] = useState(null); // 'admin' | 'operative'

  const [name, setName] = useState('');
  const [level, setLevel] = useState(1);
  const [levelInput, setLevelInput] = useState('1');
  const [skills, setSkills] = useState([]);
  const [faction, setFaction] = useState('');

  const cloudProfile = info?.profile?.cloud ?? null;
  const isCloudLinked = Boolean(cloudProfile?.characterId);
  const infoFactionLabel = normalizeFaction(info?.faction);
  const profileSummary = [info?.name, infoFactionLabel, info?.level ? `LV ${info.level}` : null]
    .filter(Boolean)
    .join(' - ');

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
    const skipProfileChoice = (authMode === 'joomla' || authMode === 'mock') && isLoggedIn;
    if (info?.role === 'operative' || skipProfileChoice) {
      setName(info?.name ?? '');
      const lv = info?.level ?? 1;
      setLevel(lv);
      setLevelInput(String(lv));
      setSkills(info?.skills ?? []);
      setRole(info?.role ?? null);
      setFaction(normalizeFaction(info?.faction ?? ''));
      setStep(1);
    } else {
      setStep(hasChosenRole ? 1 : 0);
    }
    setShowModal(true);
  };

  useEffect(() => {
    if (initRef.current) return;
    if (status === 'loading' || status === 'idle') return;

    const stored = readCharacterInfo();
    if (stored) {
      setInfo(stored);
      if (stored.faction) setFaction(normalizeFaction(stored.faction));
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
        const data = stored?.profile ? { role: 'admin', profile: stored.profile } : { role: 'admin' };
        try {
          localStorage.setItem('characterInfo', JSON.stringify(data));
        } catch {
          /* ignore */
        }
        setInfo(data);
      }
      initRef.current = true;
      return;
    }

    setShowModal(true);
    initRef.current = true;
  }, [authMode, isLoggedIn, isAdmin, status]);

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
    const f = normalizeFaction(info?.faction || faction) || 'neutral';
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
  const pointsRemaining = Math.max(0, level - skills.length);
  const canImportProfile = authMode === 'mock' || (authMode === 'joomla' && isLoggedIn);

  const handleJoomlaLogin = () => {
    if (authMode === 'mock') {
      grantMockAdmin?.();
      const stored = readCharacterInfo();
      const data = stored?.profile ? { role: 'admin', profile: stored.profile } : { role: 'admin' };
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

  const handleLocalProfile = () => {
    try {
      localStorage.setItem('ab:user-type', 'operative');
      localStorage.removeItem(PENDING_CLOUD_IMPORT_KEY);
    } catch {
      /* ignore */
    }
    setRole('operative');
    setStep(1);
  };

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
    const stored = readCharacterInfo() ?? {};
    const cloud = stored?.profile?.cloud;

    const effectiveName = cloud?.characterName || name;
    const cloudFaction = normalizeFaction(cloud?.faction);
    const localFaction = normalizeFaction(faction);
    const effectiveFaction = cloudFaction || localFaction;
    const effectiveLevel = clampLevel(cloud?.itLevel ?? level, 0, 10);

    if (!effectiveName || !effectiveFaction) return;

    const data = {
      ...stored,
      role: 'operative',
      name: effectiveName,
      level: effectiveLevel,
      skills,
      faction: effectiveFaction,
    };

    try {
      localStorage.setItem('characterInfo', JSON.stringify(data));
    } catch {
      /* ignore */
    }
    setInfo(data);
    setShowModal(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setStep(0);
  };

  const handleImportProfile = useCallback(async () => {
    try {
      const imported = await importCharacter();
      const stored = readCharacterInfo() ?? {};
      const importedFaction = normalizeFaction(imported.faction);

      const cloud = {
        accountId: joomlaId,
        characterId: imported.characterId,
        characterName: imported.characterName,
        faction: importedFaction,
        itLevel: imported.itLevel,
        importedAt: Date.now(),
      };

      const nextRole = stored.role === 'admin' ? 'admin' : 'operative';
      const nextName = imported.characterName ?? stored.name ?? '';
      const nextFaction = normalizeFaction(importedFaction || stored.faction);
      const nextLevel = clampLevel(imported.itLevel ?? stored.level ?? 1, 0, 10);

      const next = {
        ...stored,
        role: nextRole,
        name: nextName,
        faction: nextFaction,
        level: nextLevel,
        skills: Array.isArray(stored.skills) ? stored.skills : [],
        profile: mergeCloudProfile(stored.profile, cloud),
      };

      try {
        localStorage.setItem('ab:user-type', nextRole);
        localStorage.setItem('characterInfo', JSON.stringify(next));
      } catch {
        /* ignore */
      }

      setInfo(next);

      setName(nextName);
      setFaction(nextFaction);
      setLevel(nextLevel);
      setLevelInput(String(nextLevel));
      setStep(1);
      setShowModal(true);
    } catch {
      /* import errors are handled in the hook state */
      setShowModal(true);
      setStep(1);
    }
  }, [importCharacter, joomlaId]);

  const handleCloudProfile = () => {
    if (!isLoggedIn) {
      try {
        localStorage.setItem(PENDING_CLOUD_IMPORT_KEY, '1');
      } catch {
        /* ignore */
      }
      handleJoomlaLogin();
      return;
    }
    handleImportProfile();
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    let pending = false;
    try {
      pending = localStorage.getItem(PENDING_CLOUD_IMPORT_KEY) === '1';
    } catch {
      pending = false;
    }
    if (!pending) return;
    try {
      localStorage.removeItem(PENDING_CLOUD_IMPORT_KEY);
    } catch {
      /* ignore */
    }
    if (isCloudLinked) {
      setStep(1);
      setShowModal(true);
      return;
    }
    handleImportProfile();
  }, [isLoggedIn, isCloudLinked, handleImportProfile]);

  const linkedName = cloudProfile?.characterName || info?.name || '';
  const linkedFaction = normalizeFaction(cloudProfile?.faction || info?.faction);
  const linkedSyncedAt = cloudProfile?.importedAt ? new Date(cloudProfile.importedAt).toLocaleString() : '';
  const importErrorMessage = useMemo(() => {
    if (!importError?.message) return '';
    const raw = importError.message;
    if (raw.toLowerCase().includes('characterid')) {
      return 'No character found for this Joomla account yet.';
    }
    return raw;
  }, [importError]);
  const importLabel = importLoading
    ? 'Importing...'
    : isCloudLinked
    ? 'Refresh Character Profile'
    : 'Import Character Profile';
  const cloudProfileLabel = isLoggedIn ? 'Use Joomla Profile' : 'Login to Joomla';

  const showImportPanel = canImportProfile && (!isCloudLinked || importError);
  const importPanel = showImportPanel ? (
    <div
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}
    >
      {!isCloudLinked && (
        <button className="qh-btn home-nav-btn" onClick={handleImportProfile} disabled={importLoading}>
          {importLabel}
        </button>
      )}
      {importError && <p style={{ margin: 0, color: '#f87171', textAlign: 'center' }}>{importErrorMessage}</p>}
      {importError && (
        <p style={{ margin: 0, color: '#cbd5f5', textAlign: 'center' }}>
          Import failed - you can still use a local profile.
        </p>
      )}
    </div>
  ) : null;

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

      {info?.role === 'operative' && (
        <div className="profile-chip">
          <div className="profile-chip-header">
            <span className="profile-chip-label">Operative</span>
            <span className="profile-chip-name">{profileSummary || info.name}</span>
          </div>
          <div className="profile-chip-meta">
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
                  {step === 0 ? 'Choose Profile' : 'Operative Profile'}
                </h3>
              </div>
              <div style={{ maxHeight: '70vh', overflowX: 'hidden', paddingRight: '2rem', marginRight: '0.5rem' }}>
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
                      <button className="qh-btn home-nav-btn" onClick={handleLocalProfile}>
                        Local Profile
                      </button>
                      {(authMode === 'joomla' || authMode === 'mock') && (
                        <button className="qh-btn home-nav-btn" onClick={handleCloudProfile} disabled={importLoading}>
                          {importLoading ? 'Importing...' : cloudProfileLabel}
                        </button>
                      )}
                    </div>
                  </>
                )}

                {step === 1 && (
                  <>
                    {isCloudLinked && (
                      <div
                        style={{
                          border: '1px solid var(--card-border)',
                          borderRadius: '10px',
                          padding: '0.75rem',
                          textAlign: 'center',
                          marginBottom: '0.75rem',
                          position: 'relative',
                        }}
                      >
                        <button
                          type="button"
                          onClick={handleImportProfile}
                          disabled={importLoading}
                          aria-label="Refresh"
                          title="refresh"
                          style={{
                            position: 'absolute',
                            top: '0.45rem',
                            left: '0.45rem',
                            height: '26px',
                            width: '26px',
                            borderRadius: '999px',
                            border: '1px solid var(--card-border)',
                            background: 'rgba(15, 23, 42, 0.6)',
                            color: 'var(--text)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            cursor: importLoading ? 'not-allowed' : 'pointer',
                            opacity: importLoading ? 0.6 : 1,
                          }}
                        >
                          <svg
                            viewBox="0 0 24 24"
                            width="14"
                            height="14"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                            className={importLoading ? 'qh-refresh-spin' : undefined}
                          >
                            <polyline points="1 4 1 10 7 10" />
                            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                          </svg>
                        </button>
                        <p
                          style={{
                            margin: 0,
                            fontSize: '0.75rem',
                            letterSpacing: '0.08em',
                            textTransform: 'uppercase',
                          }}
                        >
                          Linked to CharGen
                        </p>
                        <p style={{ margin: '0.35rem 0 0', fontWeight: 600 }}>
                          {[linkedName, linkedFaction].filter(Boolean).join(' - ')}
                        </p>
                        {linkedSyncedAt && (
                          <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: 'var(--muted)' }}>
                            Last sync: {linkedSyncedAt}
                          </p>
                        )}
                      </div>
                    )}
                    {importPanel}
                    <label className="qh-label">
                      Name <span style={{ color: '#f87171' }}>*</span>
                      <input
                        className="qh-input"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        aria-required="true"
                        disabled={isCloudLinked}
                        style={{
                          opacity: isCloudLinked ? 0.7 : 1,
                          backgroundColor: isCloudLinked ? 'rgba(148, 163, 184, 0.18)' : undefined,
                        }}
                      />
                    </label>
                    <label className="qh-label">
                      Level (0-10) <span style={{ color: '#f87171' }}>*</span>
                      <input
                        className="qh-input"
                        type="number"
                        min="0"
                        max="10"
                        value={levelInput}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '');
                          if (!digits) {
                            setLevelInput('');
                            return;
                          }
                          const num = Number(digits);
                          if (!Number.isFinite(num)) return;
                          const clamped = Math.min(10, Math.max(0, num));
                          setLevel(clamped);
                          setLevelInput(String(clamped));
                        }}
                        onBlur={() => setLevelInput(String(level))}
                        aria-required="true"
                        disabled={isCloudLinked}
                        style={{
                          opacity: isCloudLinked ? 0.7 : 1,
                          backgroundColor: isCloudLinked ? 'rgba(148, 163, 184, 0.18)' : undefined,
                        }}
                      />
                    </label>

                    <div style={{ marginTop: '1rem' }}>
                      <h4 style={{ margin: 0, marginBottom: '.5rem' }}>
                        Faction <span style={{ color: '#f87171' }}>*</span>
                      </h4>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.5rem' }}>
                        {FACTIONS.map((f) => {
                          const label = f.charAt(0).toUpperCase() + f.slice(1);
                          const isActive = normalizeFaction(faction) === f;
                          return (
                            <button
                              key={f}
                              type="button"
                              className="qh-card qh-btn secondary qh-focus"
                              onClick={() => setFaction(f)}
                              aria-pressed={isActive}
                              disabled={isCloudLinked}
                              style={{
                                padding: '.75rem',
                                borderColor: isActive ? 'var(--accent-2)' : 'var(--card-border)',
                                opacity: isCloudLinked ? 0.65 : 1,
                                cursor: isCloudLinked ? 'not-allowed' : 'pointer',
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
                      {!isCloudLinked && (
                        <button
                          className="qh-btn"
                          disabled={!name || !faction}
                          style={{ backgroundColor: !name ? '#666' : '#00aa00' }}
                          onClick={saveOperative}
                        >
                          Save&nbsp;Profile
                        </button>
                      )}
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
