import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';

import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import './PuzzleScreen.css';
import Typewriter from '../../utils/Typewriter';

import SequencePuzzle from './SequencePuzzle';
import FrequencyPuzzle from './FrequencyPuzzle';

import UnlockedLockSVG from '../../assets/lock-unlock-icon-22.svg';

const PuzzleScreen = () => {
  const { sessionId, layerId } = useParams();
  const [searchParams] = useSearchParams();
  const [layerData, setLayerData] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [fakeDelayComplete, setFakeDelayComplete] = useState(false);
  const [localPuzzleSolved, setLocalPuzzleSolved] = useState(false);

  const navigate = useNavigate();

  // Read puzzle type & difficulty from query params (for one-off puzzle)
  const puzzleTypeParam = searchParams.get('type');
  const difficultyParam = parseInt(searchParams.get('difficulty') || '1', 10);

  useEffect(() => {
    // If we DO have sessionId+layerId, use Firestore. Otherwise, skip it
    if (!sessionId || !layerId) {
      // No Firestore usage here, so we just finish loading
      setLoading(false);
      return;
    }

    // Listen for session doc
    const sessionRef = doc(db, 'sessions', sessionId);
    const unsubSession = onSnapshot(sessionRef, (snapshot) => {
      setSessionData(snapshot.data());
    });

    // Listen for layer doc
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

  /**
   * If this layer is LOCKED (and not yet set to IN_PROGRESS or SOLVED),
   * the first person to open it automatically sets it to IN_PROGRESS.
   */
  useEffect(() => {
    if (!sessionId || !layerId) return;
    if (loading || !layerData) return;

    if (layerData.status === 'LOCKED') {
      const layerRef = doc(db, 'sessions', sessionId, 'layers', layerId);
      updateDoc(layerRef, { status: 'IN_PROGRESS' })
        .then(() => {
          console.log('Puzzle set to IN_PROGRESS');
        })
        .catch((err) => {
          console.error('Error setting puzzle to IN_PROGRESS:', err);
        });
    }
  }, [loading, layerData, sessionId, layerId]);

  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => {
        setFakeDelayComplete(true);
      }, 3000); // 3000ms = 3 seconds delay
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // A small helper for showing the "layer solved" UI
  const renderSolvedScreen = () => {
    return (
      <div className="layer-solved">
        <h3>Layer solved</h3>
        <img
          src={UnlockedLockSVG}
          alt="Unlocked lock"
          className="filter-green"
          style={{
            opacity: 0.4,
            width: '230px',
            height: '280px',
          }}
        />
        <button onClick={() => navigate(`*`)}>Sever Connection</button>
      </div>
    );
  };

  // If we are NOT using Firestore, then we rely on localPuzzleSolved
  if (!sessionId || !layerId) {
    // Once the puzzle is "solved" locally, show solved
    if (localPuzzleSolved) {
      return renderSolvedScreen();
    }

    // The puzzle might come from query params
    const puzzleType = puzzleTypeParam || 'sequence';
    const puzzleDifficulty = difficultyParam || 1;

    // Just skip the entire layered logic and show the puzzle directly
    return (
      <div>
        {puzzleType === 'sequence' && (
          <SequencePuzzle
            // pass "null" so it doesn't do Firestore stuff
            sessionId={null}
            layerId={null}
            layerData={{ difficulty: puzzleDifficulty }}
            onLocalPuzzleComplete={() => setLocalPuzzleSolved(true)}
          />
        )}
        {puzzleType === 'frequencyTuning' && (
          <FrequencyPuzzle
            sessionId={null}
            layerId={null}
            layerData={{ difficulty: puzzleDifficulty }}
            onLocalPuzzleComplete={() => setLocalPuzzleSolved(true)}
          />
        )}
      </div>
    );
  }

  if (layerData?.status !== 'SOLVED' && (loading || !fakeDelayComplete)) {
    const hackText = `Establishing secure connection...
      Identifying attack vector...
      Decoding encryption...
      Accessing ICE layer...`;

    return (
      <div
        style={{
          background: '#262e3e',
          color: '#fff',
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: 'monospace',
        }}
      >
        <Typewriter text={hackText} typingSpeed={20} />
      </div>
    );
  }

  if (loading) {
    return <div>Loading puzzle...</div>;
  }

  // If the session is ended, show a message
  if (sessionData?.status === 'FAILURE' || sessionData?.status === 'SUCCESS') {
    return <div>The session has ended!</div>;
  }

  // If layer is solved, show a message
  if (layerData?.status === 'SOLVED') {
    return renderSolvedScreen();
  }

  // If it's still locked, show a quick "Locked" message (though we're already
  // attempting to set it IN_PROGRESS in the effect above).
  if (layerData?.status === 'LOCKED') {
    return <div>Checking puzzle status...</div>;
  }

  // Otherwise, if the puzzle is in progress, display the puzzle
  if (layerData?.puzzleType === 'sequence') {
    return (
      <SequencePuzzle sessionId={sessionId} layerId={layerId} layerData={layerData} onLocalPuzzleComplete={null} />
    );
  }
  if (layerData?.puzzleType === 'frequencyTuning') {
    return (
      <FrequencyPuzzle sessionId={sessionId} layerId={layerId} layerData={layerData} onLocalPuzzleComplete={null} />
    );
  }
  if (layerData?.puzzleType === 'logic') {
    return (
      <SequencePuzzle sessionId={sessionId} layerId={layerId} layerData={layerData} onLocalPuzzleComplete={null} />
    );
  }

  return <div>Unknown puzzle type!</div>;
};

export default PuzzleScreen;
