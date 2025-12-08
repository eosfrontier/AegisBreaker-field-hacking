// components/common/PuzzleScreen.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebaseConfig';
import './PuzzleScreen.css';

import PuzzleHost from './PuzzleHost';

const PUZZLE_BOOT_STEPS = [
  { label: 'Establishing secure connection...', ms: 420 },
  { label: 'Identifying attack vector...', ms: 500 },
  { label: 'Decoding encryption...', ms: 520 },
  { label: 'Accessing ICE layer...', ms: 480 },
  { label: 'Channel stable.', ms: 320 },
];

export default function PuzzleScreen() {
  const { sessionId, layerId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const hasSessionParams = Boolean(sessionId && layerId);
  const localPuzzleType = searchParams.get('type');
  const localDifficulty = searchParams.get('difficulty');
  const completionTitleParam = searchParams.get('title') || searchParams.get('completionTitle');
  const completionSubtitleParam = searchParams.get('subtitle') || searchParams.get('completionSubtitle');

  const [layerData, setLayerData] = useState(() => {
    if (hasSessionParams) return null;
    if (!localPuzzleType) return null;
    return {
      puzzleType: localPuzzleType,
      difficulty: Number(localDifficulty) || 1,
      status: 'IN_PROGRESS',
      completionTitle: completionTitleParam || undefined,
      completionSubtitle: completionSubtitleParam || undefined,
    };
  });
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(hasSessionParams);

  useEffect(() => {
    if (!hasSessionParams) return;
    if (!sessionId || !layerId) return;

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
  }, [hasSessionParams, sessionId, layerId]);

  // Auto-move LOCKED -> IN_PROGRESS (first opener)
  useEffect(() => {
    if (!hasSessionParams) return;
    if (!sessionId || !layerId) return;
    if (loading || !layerData) return;

    if (layerData.status === 'LOCKED') {
      const layerRef = doc(db, 'sessions', sessionId, 'layers', layerId);
      updateDoc(layerRef, { status: 'IN_PROGRESS' }).catch((err) =>
        console.error('Error setting puzzle to IN_PROGRESS:', err),
      );
    }
  }, [hasSessionParams, loading, layerData, sessionId, layerId]);

  if (hasSessionParams && (sessionData?.status === 'FAILURE' || sessionData?.status === 'SUCCESS')) {
    return (
      <div className="main" style={{ padding: '1rem' }}>
        The session has ended!
      </div>
    );
  }

  const resolvedLayerData = useMemo(() => {
    if (hasSessionParams) return layerData;
    if (layerData) return layerData;
    if (!localPuzzleType) return null;
    return {
      puzzleType: localPuzzleType,
      difficulty: Number(localDifficulty) || 1,
      status: 'IN_PROGRESS',
      completionTitle: completionTitleParam || undefined,
      completionSubtitle: completionSubtitleParam || undefined,
    };
  }, [hasSessionParams, layerData, localPuzzleType, localDifficulty, completionTitleParam, completionSubtitleParam]);

  if (!hasSessionParams && !resolvedLayerData?.puzzleType) {
    return (
      <div className="main" style={{ padding: '1rem' }}>
        Missing puzzle parameters. Start from Quick Hack or a session link.
      </div>
    );
  }

  const handleExit = () => {
    if (hasSessionParams) navigate(`*`);
    else navigate('/');
  };

  return (
    <PuzzleHost
      loading={loading}
      puzzleType={resolvedLayerData?.puzzleType}
      layerData={resolvedLayerData}
      sessionId={hasSessionParams ? sessionId : null}
      layerId={hasSessionParams ? layerId : null}
      bootSteps={PUZZLE_BOOT_STEPS}
      completionTitle={completionTitleParam || resolvedLayerData?.completionTitle}
      completionSubtitle={completionSubtitleParam || resolvedLayerData?.completionSubtitle}
      onExit={handleExit}
    />
  );
}
