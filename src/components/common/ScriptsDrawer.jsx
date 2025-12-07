import { useMemo, useState } from 'react';
import { listScriptsForContext, getScriptDefinition } from './scripts/registry';
import { getScriptCharges, listScripts, runScript } from './scripts/scriptsStore';
import { useScriptContext } from './ScriptProvider';

export default function ScriptsDrawer() {
  const { contextId, ctxApi, drawerOpen, closeDrawer } = useScriptContext();
  const [, setVersion] = useState(0);
  const [notice, setNotice] = useState(null);
  const [runningId, setRunningId] = useState(null);
  const [runningProgress, setRunningProgress] = useState(0);

  const usableScripts = useMemo(() => (contextId ? listScriptsForContext(contextId) : []), [contextId]);
  const inventory = useMemo(() => listScripts(), []);
  const isAdmin = useMemo(() => {
    try {
      const raw = localStorage.getItem('characterInfo');
      return raw ? JSON.parse(raw)?.role === 'admin' : false;
    } catch {
      return false;
    }
  }, []);

  const handleRun = (scriptId) => {
    if (!contextId) return;
    if (runningId) return;
    setRunningId(scriptId);
    setRunningProgress(0);
    setNotice('Arming script…');
    // animate the bar fill
    requestAnimationFrame(() => setRunningProgress(100));
    // Brief arming delay so users see feedback, then run and close
    setTimeout(() => {
      closeDrawer();
      const res = runScript(scriptId, contextId, ctxApi);
      setRunningId(null);
      setRunningProgress(0);
      if (res.ok) {
        setNotice(null);
        setVersion((v) => v + 1);
      } else {
        let msg = 'Unable to run script.';
        if (res.error === 'no_charges') msg = 'No charges available.';
        else if (res.error === 'context_unsupported') msg = 'Script not available in this context.';
        else if (res.error === 'insufficient_labels') msg = 'Not enough labels yet to evaluate any statements.';
        else if (res.error === 'no_unknown') msg = 'No unknown modules to reveal.';
        else if (res.error === 'min_difficulty') msg = 'ICE is already at minimum difficulty.';
        else if (res.error === 'blocked') msg = 'Script could not execute.';
        setNotice(msg);
      }
    }, 2000);
  };

  const isOpen = drawerOpen;
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: isOpen ? 0 : '-360px',
        width: '340px',
        height: '100vh',
        background: 'rgba(12,14,16,0.96)',
        color: '#e5e7eb',
        boxShadow: '0 0 16px rgba(0,0,0,0.45)',
        padding: '16px',
        transition: 'right 200ms ease',
        zIndex: 1090,
        overflowY: 'auto',
        overscrollBehavior: 'contain',
        borderLeft: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Scripts</h3>
        <button
          onClick={closeDrawer}
          style={{ background: 'transparent', border: 'none', color: '#e5e7eb', cursor: 'pointer' }}
          aria-label="Close scripts drawer"
        >
          X
        </button>
      </div>
      <p style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: 8 }}>
        {contextId ? `Available in this context: ${contextId}` : 'No context detected'}
      </p>
      {notice && (
        <div
          style={{
            marginTop: 8,
            padding: '8px 10px',
            borderRadius: 6,
            background: 'rgba(255, 184, 0, 0.1)',
            color: '#facc15',
            fontSize: '0.9rem',
          }}
        >
          {notice}
        </div>
      )}

      <section style={{ marginTop: 12 }}>
        <h4 style={{ marginBottom: 4 }}>Usable now</h4>
        {usableScripts.length === 0 && <div style={{ opacity: 0.7 }}>None available in this context.</div>}
        {usableScripts.map((script) => {
          const charges = isAdmin ? Infinity : getScriptCharges(undefined, script.id);
          return (
            <div
              key={script.id}
              style={{
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8,
                padding: 10,
                marginBottom: 8,
                background: 'rgba(255,255,255,0.03)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 600 }}>{script.name}</div>
                <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>Charges: {isAdmin ? '∞' : charges}</div>
              </div>
              <p style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: 6 }}>
                {script.contextBehavior?.description || script.description || script.contextBehavior?.label}
              </p>
              <button
                disabled={runningId != null || (!isAdmin && charges <= 0)}
                onClick={() => handleRun(script.id)}
                style={{
                  width: '100%',
                  marginTop: 6,
                  padding: '8px',
                  borderRadius: 6,
                  background: runningId === script.id ? '#1f2937' : isAdmin || charges > 0 ? '#0b9' : '#444',
                  border: 'none',
                  color: '#fff',
                  cursor: runningId != null ? 'wait' : isAdmin || charges > 0 ? 'pointer' : 'not-allowed',
                }}
              >
                {runningId === script.id ? 'Engaging...' : isAdmin ? 'Run (admin)' : charges > 0 ? 'Run' : 'No charges'}
              </button>
              {runningId === script.id && (
                <div
                  style={{
                    marginTop: 6,
                    height: 6,
                    borderRadius: 6,
                    background: '#111',
                    border: '1px solid rgba(255,255,255,0.1)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${runningProgress}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #0b9, #0ff)',
                      transition: 'width 2s linear',
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </section>

      <section style={{ marginTop: 16 }}>
        <h4 style={{ marginBottom: 4 }}>All scripts</h4>
        {inventory.length === 0 && <div style={{ opacity: 0.7 }}>You have no scripts yet.</div>}
        {inventory.map((item) => {
          const def = getScriptDefinition(item.id);
          return (
            <div
              key={item.id}
              style={{
                border: '1px dashed rgba(255,255,255,0.08)',
                borderRadius: 8,
                padding: 8,
                marginBottom: 8,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{def?.name || item.id}</div>
                  <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>{def?.description}</div>
                </div>
                <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>Charges: {isAdmin ? '∞' : item.charges}</div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
