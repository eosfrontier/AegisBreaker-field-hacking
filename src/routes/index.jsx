import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
// import AdminSessionEditor from "../components/AdminPanel/SessionEditor";
// import SessionScreen from "../components/MainHackingScreen/SessionScreen";
// import PuzzleScreen from "../components/Puzzle/PuzzleScreen";
// import UnplannedPuzzleScreen from "../components/UnplannedPuzzle/UnplannedPuzzleScreen";

// Lazy imports to account for spotty internet connection
const AdminPanelLayout = lazy(() => import('../components/AdminPanel/AdminPanelLayout'));
const SessionScreen = lazy(() => import('../components/MainHackingScreen/MainHackingScreen'));
const PuzzleScreen = lazy(() => import('../components/Puzzle/PuzzleScreen'));
const QuickHackScreen = lazy(() => import('../components/UnplannedPuzzle/QuickHackScreen'));
const HomePage = lazy(() => import('../components/Home/HomePage'));
const QrScannerPage = lazy(() => import('../components/Scanner/QrScannerPage'));

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<div>Establishing connection...</div>}>
        <Routes>
          {/* Home Page */}
          <Route path="/" element={<HomePage />} />

          {/* Admin Panel */}
          <Route path="/admin" element={<AdminPanelLayout />} />

          {/* Main Hacking Screen */}
          <Route path="/session/:sessionId" element={<SessionScreen />} />

          {/* Puzzle Screen */}
          <Route path="/puzzle/:sessionId/:layerId" element={<PuzzleScreen />} />

          {/* Unplanned Puzzle */}
          <Route path="/QuickHack" element={<QuickHackScreen />} />

          {/* Optional QR Scanner */}
          <Route path="/qr-scanner" element={<QrScannerPage />} />

          {/* Fallback or catch-all */}
          <Route path="*" element={<div>Not Found</div>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default AppRoutes;
