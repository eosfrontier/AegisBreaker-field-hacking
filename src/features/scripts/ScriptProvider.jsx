import { createContext, useContext, useMemo, useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ScriptsDrawer from './ScriptsDrawer';

const ScriptCtx = createContext(null);

export function ScriptProvider({ children }) {
  const [contextId, setContextId] = useState(null);
  const [ctxApi, setCtxApi] = useState({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const shouldShowScripts = useMemo(() => {
    if (!location) return false;
    const path = location.pathname || '';
    return path.startsWith('/puzzle');
  }, [location]);

  const setScriptContext = useCallback(({ id, api }) => {
    setContextId(id || null);
    setCtxApi(api || {});
  }, []);

  const value = useMemo(
    () => ({
      contextId,
      ctxApi,
      drawerOpen,
      setScriptContext,
      openDrawer: () => setDrawerOpen(true),
      closeDrawer: () => setDrawerOpen(false),
      toggleDrawer: () => setDrawerOpen((o) => !o),
    }),
    [contextId, ctxApi, drawerOpen, setScriptContext],
  );

  useEffect(() => {
    if (!shouldShowScripts && drawerOpen) {
      setDrawerOpen(false);
    }
  }, [shouldShowScripts, drawerOpen]);

  // Lock background scroll when drawer is open
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  return (
    <ScriptCtx.Provider value={value}>
      {children}
      {shouldShowScripts && (
        <>
          <ScriptsDrawer />
          <button
            aria-label="Open scripts"
            onClick={() => setDrawerOpen((o) => !o)}
            style={{
              position: 'fixed',
              bottom: '16px',
              right: '16px',
              zIndex: 1100,
              background: '#0b9',
              color: '#fff',
              border: 'none',
              borderRadius: '999px',
              padding: '12px 16px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
              cursor: 'pointer',
            }}
          >
            Scripts
          </button>
        </>
      )}
    </ScriptCtx.Provider>
  );
}

export function useScriptContext() {
  const ctx = useContext(ScriptCtx);
  if (!ctx) {
    throw new Error('useScriptContext must be used within ScriptProvider');
  }
  return ctx;
}
