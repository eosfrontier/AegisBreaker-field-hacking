// components/Puzzle/PuzzleScreen.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import './PuzzleScreen.css';

import BootSplash from '../common/BootSplash'; // <— new splash
import SequencePuzzle from './SequencePuzzle';
import FrequencyPuzzle from './FrequencyPuzzle';
import LogicPuzzle from './LogicPuzzle';
import MasterLockPuzzle from './MasterLockPuzzle';

import UnlockedLockSVG from '../../assets/lock-unlock-icon-22.svg';

const PUZZLE_BOOT_STEPS = [
  { label: 'Establishing secure connection…', ms: 420 },
  { label: 'Identifying attack vector…', ms: 500 },
  { label: 'Decoding encryption…', ms: 520 },
  { label: 'Accessing ICE layer…', ms: 480 },
  { label: 'Channel stable.', ms: 320 },
];

export default function PuzzleScreen() {
  const { sessionId, layerId } = useParams();
  const [layerData, setLayerData] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showBoot, setShowBoot] = useState(() => {
    // Skip exactly once if we navigated here behind a pre-splash
    try {
      const skip = sessionStorage.getItem('ab:bootSkipOnce') === '1';
      if (skip) sessionStorage.removeItem('ab:bootSkipOnce');
      return !skip;
    } catch {
      return true;
    }
  });

  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionId || !layerId) {
      setLoading(false);
      return;
    }

    const sessionRef = doc(db, 'sessions', sessionId);
    const unsubSession = onSnapshot(sessionRef, (snapshot) => {
      setSessionData(snapshot.data());
    });

    const layerRef = doc(db, 'sessions', sessionId, 'layers', layerId);
    const unsubLayer = onSnapshot(layerRef, (snapshot) => {
      setLayerData(snapshot.data());
      setLoading(false);
    });

    return () => {
      unsubSession();
      unsubLayer();
    };
  }, [sessionId, layerId]);

  // Auto-move LOCKED -> IN_PROGRESS (first opener)
  useEffect(() => {
    if (!sessionId || !layerId) return;
    if (loading || !layerData) return;

    if (layerData.status === 'LOCKED') {
      const layerRef = doc(db, 'sessions', sessionId, 'layers', layerId);
      updateDoc(layerRef, { status: 'IN_PROGRESS' }).catch((err) =>
        console.error('Error setting puzzle to IN_PROGRESS:', err),
      );
    }
  }, [loading, layerData, sessionId, layerId]);

  const renderSolvedScreen = () => (
    <div className="Quickhack-main layer-solved" style={{ textAlign: 'center' }}>
      <h3>Layer solved</h3>
      <img
        src={UnlockedLockSVG}
        alt="Unlocked lock"
        className="filter-green"
        style={{ opacity: 0.4, width: '230px', height: '280px' }}
      />
      <button className="qh-btn" onClick={() => navigate(`*`)}>
        Sever Connection
      </button>
    </div>
  );

  // Ended session
  if (sessionData?.status === 'FAILURE' || sessionData?.status === 'SUCCESS') {
    return (
      <div className="Quickhack-main" style={{ padding: '1rem' }}>
        The session has ended!
      </div>
    );
  }

  // Layer solved
  if (layerData?.status === 'SOLVED') {
    return renderSolvedScreen();
  }

  // Boot overlay: show on first arrival (unless skipped once), and HOLD until Firestore is ready
  const bootOverlay = (
    <BootSplash
      show={showBoot}
      holdUntil={loading}
      onDone={() => setShowBoot(false)}
      steps={PUZZLE_BOOT_STEPS}
      allowSkip={true}
    />
  );

  // While loading and/or splash is up, render an empty themed container so overlay sits on top
  if (loading || showBoot) {
    return (
      <div className="Quickhack-main" style={{ minHeight: '60vh' }}>
        {bootOverlay}
      </div>
    );
  }

  // Active puzzle
  return (
    <div className="Quickhack-main">
      {bootOverlay /* briefly mounts/fades out; now not visible */}
      {layerData?.puzzleType === 'sequence' && (
        <SequencePuzzle sessionId={sessionId} layerId={layerId} layerData={layerData} onLocalPuzzleComplete={null} />
      )}
      {layerData?.puzzleType === 'frequencyTuning' && (
        <FrequencyPuzzle sessionId={sessionId} layerId={layerId} layerData={layerData} onLocalPuzzleComplete={null} />
      )}
      {layerData?.puzzleType === 'logic' && (
        <LogicPuzzle sessionId={sessionId} layerId={layerId} layerData={layerData} onLocalPuzzleComplete={null} />
      )}
      {layerData?.puzzleType === 'masterLock' && (
        <MasterLockPuzzle sessionId={sessionId} layerId={layerId} layerData={layerData} onLocalPuzzleComplete={null} />
      )}
      {!layerData?.puzzleType && <div style={{ padding: '1rem' }}>Unknown puzzle type!</div>}
    </div>
  );
}
