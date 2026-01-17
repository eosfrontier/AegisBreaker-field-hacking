import { BrowserRouter, useLocation } from 'react-router-dom';
import { Suspense, useEffect } from 'react';
import { getAuthMode, JoomlaSessionProvider, useJoomlaSession } from '../../auth/JoomlaSessionContext';
import { ScriptProvider } from '../../features/scripts/ScriptProvider';
import AnimatedRoutes from './AnimatedRoutes';

const PrefetchRoutes = () => {
  useEffect(() => {
    import('../../features/unplanned-puzzle/QuickHackScreen');
    import('../../features/scanner/QrScannerPage');
    import('../../features/scripts/ScriptStore');
  }, []);
  return null;
};

const JoomlaSessionRefresher = () => {
  const location = useLocation();
  const { refresh } = useJoomlaSession();

  useEffect(() => {
    if (getAuthMode() !== 'joomla') return;
    refresh();
  }, [location.pathname, location.search, refresh]);

  return null;
};

const AppRoutes = () => (
  <BrowserRouter>
    <JoomlaSessionProvider>
      <ScriptProvider>
        <Suspense
          fallback={
            <div
              style={{
                position: 'fixed',
                top: 16,
                right: 16,
                padding: '8px 12px',
                background: 'rgba(12,14,16,0.9)',
                color: '#e5e7eb',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(0,0,0,0.35)',
                zIndex: 1200,
                fontSize: '0.9rem',
              }}
            >
              Loading.
            </div>
          }
        >
          <JoomlaSessionRefresher />
          <PrefetchRoutes />
          <AnimatedRoutes />
        </Suspense>
      </ScriptProvider>
    </JoomlaSessionProvider>
  </BrowserRouter>
);

export default AppRoutes;
