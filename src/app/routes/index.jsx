import { BrowserRouter } from 'react-router-dom';
import { Suspense, useEffect } from 'react';
import { ScriptProvider } from '../../features/scripts/ScriptProvider';
import AnimatedRoutes from './AnimatedRoutes';

const PrefetchRoutes = () => {
  useEffect(() => {
    import('../../features/puzzles/common/PuzzleScreen');
    import('../../features/hacking-session/MainHackingScreen');
    import('../../features/unplanned-puzzle/QuickHackScreen');
    import('../../features/scanner/QrScannerPage');
    import('../../features/scripts/ScriptStore');
  }, []);
  return null;
};

const AppRoutes = () => (
  <BrowserRouter>
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
            Loading…
          </div>
        }
      >
        <PrefetchRoutes />
        <AnimatedRoutes />
      </Suspense>
    </ScriptProvider>
  </BrowserRouter>
);

export default AppRoutes;
