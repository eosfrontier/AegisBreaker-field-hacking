import { BrowserRouter, Routes, Route } from "react-router-dom";
import AdminPanelLayout from '../components/AdminPanel/AdminPanelLayout';
// import AdminSessionEditor from "../components/AdminPanel/SessionEditor";
// import SessionScreen from "../components/MainHackingScreen/SessionScreen";
// import PuzzleScreen from "../components/Puzzle/PuzzleScreen";
// import UnplannedPuzzleScreen from "../components/UnplannedPuzzle/UnplannedPuzzleScreen";

const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Admin Panel */}
        <Route path="/admin" element={<AdminPanelLayout />} />
        {/* <Route path="/admin/sessions/:sessionId" element={<AdminSessionEditor />} /> */}

        {/* Main Hacking Screen */}
        {/* <Route path="/session/:sessionId" element={<SessionScreen />} /> */}

        {/* Puzzle Screen */}
        {/* <Route path="/puzzle/:sessionId/:layerId" element={<PuzzleScreen />} /> */}

        {/* Unplanned Puzzle */}
        {/* <Route path="/puzzle/unplanned/:difficulty" element={<UnplannedPuzzleScreen />} /> */}

        {/* Fallback or home route */}
        <Route path="*" element={<div>Not Found</div>} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRoutes;
