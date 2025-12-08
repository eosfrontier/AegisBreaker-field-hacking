// AnimatedRoutes.jsx
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';

import AdminPanelLayout from '../../features/admin/AdminPanelLayout';
import SessionScreen from '../../features/hacking-session/MainHackingScreen';
import PuzzleScreen from '../../features/puzzles/common/PuzzleScreen';
import QuickHackScreen from '../../features/unplanned-puzzle/QuickHackScreen';
import GmQrGenerator from '../../features/unplanned-puzzle/GmQrGenerator';
import HomePage from '../../features/home/HomePage';
import QrScannerPage from '../../features/scanner/QrScannerPage';
import ScriptStore from '../../features/scripts/ScriptStore';
import FeedbackDashboard from '../../features/admin/FeedbackDashboard';

const AnimatedRoutes = () => {
  const location = useLocation();

  const transitionState = location.state?.transition ?? {};
  const direction = transitionState.direction ?? 'fade';

  let initial;

  switch (direction) {
    case 'from-left':
      initial = { x: '-100%', y: 0, opacity: 0 };
      break;

    case 'from-right':
      initial = { x: '100%', y: 0, opacity: 0 };
      break;

    case 'from-bottom':
      initial = { x: 0, y: '-100%', opacity: 0 };
      break;

    case 'from-top':
      initial = { x: 0, y: '-100%', opacity: 0 };
      break;

    default:
      initial = { opacity: 0, scale: 0.98 };
  }

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial={initial}
        animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        transition={{ type: 'tween', ease: 'easeInOut', duration: 0.35 }}
        style={{ width: '100%', height: '100%', position: 'relative' }}
      >
        <Routes location={location}>
          {/* Home Page */}
          <Route path="/" element={<HomePage />} />

          {/* Admin Panel */}
          <Route path="/admin" element={<AdminPanelLayout />} />
          <Route path="/admin/feedback" element={<FeedbackDashboard />} />

          {/* Main Hacking Screen */}
          <Route path="/session/:sessionId" element={<SessionScreen />} />

          {/* Puzzles */}
          <Route path="/puzzle" element={<PuzzleScreen />} />
          <Route path="/puzzle/:sessionId/:layerId" element={<PuzzleScreen />} />

          {/* Unplanned Puzzle */}
          <Route path="/QuickHack" element={<QuickHackScreen />} />
          <Route path="/gm-qr" element={<GmQrGenerator />} />

          {/* QR Scanner */}
          <Route path="/qr-scanner" element={<QrScannerPage />} />

          {/* Scripts Store */}
          <Route path="/scripts-store" element={<ScriptStore />} />

          {/* Fallback */}
          <Route path="*" element={<div>Not Found</div>} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;
