import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy, useEffect } from 'react';
import { ScriptProvider } from '../components/common/ScriptProvider';

const AdminPanelLayout = lazy(() => import('../components/AdminPanel/AdminPanelLayout'));
const SessionScreen = lazy(() => import('../components/MainHackingScreen/MainHackingScreen'));
const PuzzleScreen = lazy(() => import('../components/common/PuzzleScreen'));
const QuickHackScreen = lazy(() => import('../components/UnplannedPuzzle/QuickHackScreen'));
const GmQrGenerator = lazy(() => import('../components/UnplannedPuzzle/GmQrGenerator'));
const HomePage = lazy(() => import('../components/Home/HomePage'));
const QrScannerPage = lazy(() => import('../components/Scanner/QrScannerPage'));
const ScriptStore = lazy(() => import('../components/common/ScriptStore'));
const FeedbackDashboard = lazy(() => import('../components/AdminPanel/FeedbackDashboard'));

const PrefetchRoutes = () => {
  useEffect(() => {
    import('../components/common/PuzzleScreen');
    import('../components/MainHackingScreen/MainHackingScreen');
  }, []);
  return null;
};

const AppRoutes = () => {
  return (
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
          <Routes>
            {/* Home Page */}
            <Route path="/" element={<HomePage />} />

            {/* Admin Panel */}
            <Route path="/admin" element={<AdminPanelLayout />} />
            <Route path="/admin/feedback" element={<FeedbackDashboard />} />

            {/* Main Hacking Screen */}
            <Route path="/session/:sessionId" element={<SessionScreen />} />

            {/* Puzzle Screen (supports both session and local query params) */}
            <Route path="/puzzle" element={<PuzzleScreen />} />
            <Route path="/puzzle/:sessionId/:layerId" element={<PuzzleScreen />} />

            {/* Unplanned Puzzle */}
            <Route path="/QuickHack" element={<QuickHackScreen />} />
            <Route path="/gm-qr" element={<GmQrGenerator />} />

            {/* Optional QR Scanner */}
            <Route path="/qr-scanner" element={<QrScannerPage />} />

            {/* Scripts Store */}
            <Route path="/scripts-store" element={<ScriptStore />} />

            {/* Fallback or catch-all */}
            <Route path="*" element={<div>Not Found</div>} />
          </Routes>
        </Suspense>
      </ScriptProvider>
    </BrowserRouter>
  );
};

export default AppRoutes;
