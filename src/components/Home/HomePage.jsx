import { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAvailableSkills, getLabelById } from './skill-catalogue';
import { AiOutlineSetting } from 'react-icons/ai';
import './HomePage.css';

export default function HomePage() {
  const navigate = useNavigate();

  // persistent data ―——————————————————————————————————————————————————
  const [info, setInfo] = useState(null); // {role,name,level,skills}
  const [showModal, setShowModal] = useState(false);

  // modal step state ―———————————————————————————————————————————————
  const [step, setStep] = useState(0); // 0=role  1=operative-form
  const [, setRole] = useState(null); // 'admin' | 'operative'

  const [name, setName] = useState('');
  const [level, setLevel] = useState(1);
  const [skills, setSkills] = useState([]);

  const openProfileModal = () => {
    if (info) {
      setName(info.name ?? '');
      setLevel(info.level ?? 1);
      setSkills(info.skills ?? []);
      setRole(info.role ?? null);
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
      setInfo(JSON.parse(stored));
    } else {
      setShowModal(true);
    }
  }, []);

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

  const saveOperative = () => {
    const newInfo = { role: 'operative', name, level, skills };
    localStorage.setItem('characterInfo', JSON.stringify(newInfo));
    setInfo(newInfo);
    closeModal();
  };

  const closeModal = () => {
    setShowModal(false);
    setStep(0);
  };

  // ──────────────────────────────────────────────────────────────────
  return (
    <div className="main">
      <button className="qh-profile-btn" onClick={openProfileModal}>
        <AiOutlineSetting size={24} />
      </button>
      <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>Field Hacking App</h2>

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

      {/* ────── Modal ────── */}
      {showModal && (
        <div className="qh-modal-overlay">
          <div className="qh-modal">
            {/* STEP 0 – choose role */}
            {step === 0 && (
              <>
                <h3 style={{ textAlign: 'center' }}>Identify Role</h3>
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
                <h3 style={{ textAlign: 'center' }}>Operative Profile</h3>

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
                  <button className="qh-btn" onClick={() => setStep(0)}>
                    Back
                  </button>
                  <button
                    className="qh-btn"
                    disabled={!name || skills.length !== level}
                    style={{ backgroundColor: !name || skills.length !== level ? '#666' : '#00aa00' }}
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
