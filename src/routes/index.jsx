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
const Testing = lazy(() => import('../components/test'));
const QuickHackScreen = lazy(() => import('../components/UnplannedPuzzle/QuickHackScreen'))

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Suspense fallback={<div>Establishing connection...</div>}>
        <Routes>
          {/* Admin Panel */}
          <Route path="/admin" element={<AdminPanelLayout />} />
          {/* <Route path="/admin/sessions/:sessionId" element={<AdminSessionEditor />} /> */}

          {/* Main Hacking Screen */}
          <Route path="/session/:sessionId" element={<SessionScreen />} />

          {/* Puzzle Screen */}
          <Route path="/puzzle/:sessionId/:layerId" element={<PuzzleScreen />} />

          {/* Puzzle Screen */}
          <Route path="/test" element={<Testing />} />

          {/* Unplanned Puzzle */}
          <Route
          path="/QuickHack" element={
            <Suspense fallback={<div>Loading QuickHack...</div>}>
              <QuickHackScreen />
            </Suspense>
          }
          />

          {/* Fallback or home route */}
          <Route path="*" element={<div>Not Found</div>} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
};

export default AppRoutes;
