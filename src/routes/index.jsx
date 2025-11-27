import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { ScriptProvider } from '../components/common/ScriptProvider';

// Lazy imports to keep chunks smaller
const AdminPanelLayout = lazy(() => import('../components/AdminPanel/AdminPanelLayout'));
const SessionScreen = lazy(() => import('../components/MainHackingScreen/MainHackingScreen'));
const PuzzleScreen = lazy(() => import('../components/common/PuzzleScreen'));
const QuickHackScreen = lazy(() => import('../components/UnplannedPuzzle/QuickHackScreen'));
const GmQrGenerator = lazy(() => import('../components/UnplannedPuzzle/GmQrGenerator'));
const HomePage = lazy(() => import('../components/Home/HomePage'));
const QrScannerPage = lazy(() => import('../components/Scanner/QrScannerPage'));
const ScriptStore = lazy(() => import('../components/common/ScriptStore'));

const AppRoutes = () => {
  return (
    <ScriptProvider>
      <BrowserRouter>
        <Suspense fallback={<div>Establishing connection...</div>}>
          <Routes>
            {/* Home Page */}
            <Route path="/" element={<HomePage />} />

            {/* Admin Panel */}
            <Route path="/admin" element={<AdminPanelLayout />} />

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
      </BrowserRouter>
    </ScriptProvider>
  );
};

export default AppRoutes;
