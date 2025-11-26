import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ScriptProvider } from '../components/common/ScriptProvider';

// Lazy imports commented out for now (kept for reference)
// import { Suspense, lazy } from 'react';
// // Lazy imports to account for spotty internet connection
// const AdminPanelLayout = lazy(() => import('../components/AdminPanel/AdminPanelLayout'));
// const SessionScreen = lazy(() => import('../components/MainHackingScreen/MainHackingScreen'));
// const PuzzleScreen = lazy(() => import('../components/common/PuzzleScreen'));
// const QuickHackScreen = lazy(() => import('../components/UnplannedPuzzle/QuickHackScreen'));
// const HomePage = lazy(() => import('../components/Home/HomePage'));
// const QrScannerPage = lazy(() => import('../components/Scanner/QrScannerPage'));
// const ScriptStore = lazy(() => import('../components/common/ScriptStore'));

// Regular (non-lazy) imports
import AdminPanelLayout from '../components/AdminPanel/AdminPanelLayout';
import SessionScreen from '../components/MainHackingScreen/MainHackingScreen';
import PuzzleScreen from '../components/common/PuzzleScreen';
import QuickHackScreen from '../components/UnplannedPuzzle/QuickHackScreen';
import HomePage from '../components/Home/HomePage';
import QrScannerPage from '../components/Scanner/QrScannerPage';
import ScriptStore from '../components/common/ScriptStore';

const AppRoutes = () => {
  return (
    <ScriptProvider>
      <BrowserRouter>
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

          {/* Optional QR Scanner */}
          <Route path="/qr-scanner" element={<QrScannerPage />} />

          {/* Scripts Store */}
          <Route path="/scripts-store" element={<ScriptStore />} />

          {/* Fallback or catch-all */}
          <Route path="*" element={<div>Not Found</div>} />
        </Routes>
      </BrowserRouter>
    </ScriptProvider>
  );
};

export default AppRoutes;
