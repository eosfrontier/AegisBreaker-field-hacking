import { useEffect, useMemo, useState } from 'react';
import { getScriptCharges, grantScript } from './scriptsStore';
import { getScriptDefinition } from './registry';
import { useNavigate } from 'react-router-dom';
import './ScriptStore.css';

const SCRIPT_STORE_ITEMS = [
  { id: 'scan', name: 'Scan', price: 50, reqSkill: 'scan', minLevel: 1 },
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
  const [, setVersion] = useState(0);
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
    return SCRIPT_STORE_ITEMS.reduce((acc, item) => {
      const def = getScriptDefinition(item.id);
      const contexts = def?.contexts || {};
      const hasRunnable = Object.values(contexts).some((ctx) => typeof ctx?.run === 'function');
      if (!def || !hasRunnable) return acc; // hide undefined/unimplemented scripts

      const unlocked = isAdmin || (level >= item.minLevel && skills.includes(item.reqSkill));
      acc.push({
        ...item,
        description: def.description,
        unlocked,
        charges: getScriptCharges(undefined, item.id),
      });
      return acc;
    }, []);
  }, [isAdmin, level, skills]);

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
    <div className="main script-store">
      <div className="script-store__header">
        <div>
          <p className="eyebrow">Black ICE Emporium</p>
          <h2>Scripts Store</h2>
        </div>
        <div className="credits-chip">
          <span className="label">Credits</span>
          <strong>{isAdmin ? '∞' : credits}</strong>
        </div>
        <button className="home-nav-btn" onClick={() => navigate('/', { state: { transition: 'fade' } })}>
          Back
        </button>
      </div>

      <div className="script-grid">
        {items.map((item) => (
          <article key={item.id} className="script-card">
            <div className="script-card__top">
              <div>
                <div className="script-name">{item.name}</div>
              </div>
              <div className="badge">Charges: {item.charges}</div>
            </div>
            <div className="script-desc">{item.description || 'Script module'}</div>

            <div className="script-meta">
              <span>Req. Lv {item.minLevel}</span>
              <span className="divider">•</span>
              <span>Skill: {item.reqSkill}</span>
            </div>

            {!item.unlocked && !isAdmin && <div className="locked">Locked</div>}

            <div className="script-card__actions">
              <div className="price">Price: {item.price} cr</div>
              <button
                className="home-nav-btn small"
                style={{ minWidth: 50, width: '110px' }}
                disabled={(!item.unlocked && !isAdmin) || (!isAdmin && credits < item.price)}
                onClick={() => handleBuy(item.id, item.price)}
              >
                {isAdmin ? 'Grant' : credits < item.price ? 'Insufficient' : 'Buy'}
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
