import { useEffect, useMemo, useState } from 'react';
import { getScriptCharges, grantScript } from './scripts/scriptsStore';
import { getScriptDefinition } from './scripts/registry';
import { useNavigate } from 'react-router-dom';

const SCRIPT_STORE_ITEMS = [
  { id: 'contradiction_scan', name: 'Scan', price: 50, reqSkill: 'scan', minLevel: 1 },
  { id: 'snoop', name: 'Snoop', price: 60, reqSkill: 'script_snoop', minLevel: 3 },
  { id: 'mask', name: 'Mask', price: 60, reqSkill: 'script_mask', minLevel: 3 },
  { id: 'weaken_ice', name: 'Weaken ICE', price: 75, reqSkill: 'script_weaken_ice', minLevel: 3 },
  { id: 'override', name: 'Override', price: 100, reqSkill: 'script_override', minLevel: 5 },
  { id: 'worm', name: 'Worm', price: 120, reqSkill: 'script_worm', minLevel: 7 },
  { id: 'zeroday', name: 'Zero Day', price: 200, reqSkill: 'script_zeroday', minLevel: 9 },
  { id: 'shield', name: 'Shield', price: 90, reqSkill: 'script_shield', minLevel: 9 },
  { id: 'recon', name: 'Recon', price: 70, reqSkill: 'script_snoop', minLevel: 3 },
  { id: 'auto_step', name: 'Auto-Step', price: 110, reqSkill: 'script_worm', minLevel: 7 },
];

const CREDITS_KEY = 'ab:credits';
const ensureCredits = () => {
  try {
    const raw = localStorage.getItem(CREDITS_KEY);
    if (raw == null) {
      localStorage.setItem(CREDITS_KEY, '500');
      return 500;
    }
    const num = Number(raw);
    return Number.isFinite(num) ? num : 0;
  } catch {
    return 0;
  }
};

export default function ScriptStore() {
  const navigate = useNavigate();
  const [credits, setCredits] = useState(() => ensureCredits());
  const [version, setVersion] = useState(0);
  const [character] = useState(() => {
    try {
      const raw = localStorage.getItem('characterInfo');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    localStorage.setItem(CREDITS_KEY, String(credits));
  }, [credits]);

  const skills = useMemo(() => character?.skills || [], [character]);
  const level = useMemo(() => character?.level || 1, [character]);
  const isAdmin = character?.role === 'admin';

  const items = useMemo(() => {
    return SCRIPT_STORE_ITEMS.map((item) => {
      const def = getScriptDefinition(item.id);
      const unlocked = isAdmin || (level >= item.minLevel && skills.includes(item.reqSkill));
      return {
        ...item,
        description: def?.description,
        unlocked,
        charges: getScriptCharges(undefined, item.id),
      };
    });
  }, [isAdmin, level, skills, credits, version]);

  const handleBuy = (id, price) => {
    if (isAdmin) {
      grantScript(undefined, id, 1);
      setVersion((v) => v + 1);
      return;
    }
    if (credits < price) return;
    grantScript(undefined, id, 1);
    setCredits((c) => c - price);
    setVersion((v) => v + 1);
  };

  return (
    <div className="main" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Scripts Store</h2>
        <button className="qh-btn" onClick={() => navigate(-1)}>
          Back
        </button>
      </div>
      <p style={{ marginTop: 4 }}>Credits: {isAdmin ? '∞' : credits}</p>
      <div style={{ display: 'grid', gap: '12px', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {items.map((item) => (
          <div key={item.id} className="qh-card" style={{ padding: '12px', border: '1px solid var(--card-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700 }}>{item.name}</div>
                <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>{item.description || 'Script module'}</div>
              </div>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Charges: {item.charges}</div>
            </div>
            <div style={{ marginTop: 8, fontSize: '0.85rem', opacity: 0.85 }}>
              Requires level {item.minLevel} & skill: {item.reqSkill}
            </div>
            {!item.unlocked && !isAdmin && (
              <div style={{ marginTop: 6, color: '#f87171', fontSize: '0.9rem' }}>Locked</div>
            )}
            <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>Price: {item.price} cr</div>
              <button
                className="qh-btn"
                disabled={(!item.unlocked && !isAdmin) || (!isAdmin && credits < item.price)}
                onClick={() => handleBuy(item.id, item.price)}
              >
                {isAdmin ? 'Grant' : credits < item.price ? 'Insufficient' : 'Buy'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
