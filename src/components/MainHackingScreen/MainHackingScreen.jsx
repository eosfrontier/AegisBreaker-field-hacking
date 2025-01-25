import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, collection, query, where, onSnapshot, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import QRCode from 'react-qr-code';
import './MainHackingScreen.css';

function MainHackingScreen() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // Session data, including theme, timeLimit, etc.
  const [sessionData, setSessionData] = useState(null);
  // The parent's session data (if any)
  const [parentSessionData, setParentSessionData] = useState(null);
  // Child sessions (if current sessionId is their parent)
  const [childSessions, setChildSessions] = useState([]);
  // Whether this session is locked due to parent not being SUCCESS
  const [isLocked, setIsLocked] = useState(false);

  // Layers for this session
  const [layers, setLayers] = useState([]);

  // Local time left (in seconds)
  const [timeLeft, setTimeLeft] = useState(0);

  // Hack phase: "INIT" | "ACTIVE" | "SUCCESS" | "FAILURE"
  const [hackPhase, setHackPhase] = useState('INIT');

  // Prevent multiple success/failure updates
  const successOrFailRef = useRef(false);

  /**
   *  1) Subscribe to the current session doc
   *  2) Check if there's a parentSessionId
   *  3) Fetch child sessions
   *  4) Fetch layers (sorted by group, then createdAt)
   */
  useEffect(() => {
    if (!sessionId) return;

    // --- Subscribe to Current Session Doc ---
    const sessionRef = doc(db, 'sessions', sessionId);
    const unsubSession = onSnapshot(sessionRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSessionData({ id: docSnap.id, ...data });

        // Determine hackPhase from doc's status
        if (data.status === 'ACTIVE') {
          setHackPhase('ACTIVE');
          // Calculate local timeLeft if endTime exists
          if (data.endTime) {
            const endMillis = data.endTime.toMillis();
            const nowMillis = Date.now();
            const remaining = Math.floor((endMillis - nowMillis) / 1000);
            setTimeLeft(remaining > 0 ? remaining : 0);
          }
        } else if (data.status === 'SUCCESS') {
          setHackPhase('SUCCESS');
        } else if (data.status === 'FAILURE') {
          setHackPhase('FAILURE');
        } else {
          // default "INIT"
          setHackPhase('INIT');
        }

        // --- If there's a parent session, fetch it ---
        if (data.parentSessionId) {
          const parentRef = doc(db, 'sessions', data.parentSessionId);
          const parentSnap = await getDoc(parentRef);
          if (parentSnap.exists()) {
            const parentData = parentSnap.data();
            setParentSessionData({ id: parentSnap.id, ...parentData });
            // If parent's status != SUCCESS, lock this session
            if (parentData.status !== 'SUCCESS') {
              setIsLocked(true);
            } else {
              setIsLocked(false);
            }
          } else {
            // No parent doc found; consider it unlocked
            setParentSessionData(null);
            setIsLocked(false);
          }
        } else {
          // No parent
          setParentSessionData(null);
          setIsLocked(false);
        }
      } else {
        console.warn('Session doc does not exist or was removed');
        setSessionData(null);
      }
    });

    // --- Query Child Sessions ---
    // If other sessions have parentSessionId = sessionId, they are children.
    const childrenRef = collection(db, 'sessions');
    const q = query(childrenRef, where('parentSessionId', '==', sessionId));
    const unsubChildren = onSnapshot(q, (querySnap) => {
      const foundChildren = [];
      querySnap.forEach((childDoc) => {
        foundChildren.push({
          id: childDoc.id,
          ...childDoc.data(),
        });
      });
      setChildSessions(foundChildren);
    });

    // --- Subscribe to Layers ---
    // We sort by group ascending, then by createdAt ascending
    // Note: Firestore requires a composite index if we do multiple orderBys
    const layersRef = collection(db, 'sessions', sessionId, 'layers');
    // We can either create a query with multiple orderBy, or just fetch all and sort in JS
    // We'll do it in JS for simplicity, but if you prefer Firestore side sorting, create the appropriate index.
    const unsubLayers = onSnapshot(layersRef, (snapshot) => {
      let layerArray = [];
      snapshot.forEach((layerDoc) => {
        layerArray.push({
          id: layerDoc.id,
          ...layerDoc.data(),
        });
      });
      // Sort by group ascending, then by createdAt ascending
      layerArray.sort((a, b) => {
        // If group differs, sort by group
        if (a.group !== b.group) {
          return a.group - b.group;
        }
        // Otherwise sort by createdAt
        if (a.createdAt && b.createdAt) {
          return a.createdAt.toMillis() - b.createdAt.toMillis();
        }
        // fallback if missing createdAt
        return 0;
      });
      setLayers(layerArray);
    });

    return () => {
      unsubSession();
      unsubChildren();
      unsubLayers();
    };
  }, [sessionId]);

  /**
   * Initialize Hack: sets status=ACTIVE and endTime in Firestore.
   */
  const handleInitializeHack = async () => {
    if (!sessionData || !sessionData.timeLimit) return;

    const futureTime = Date.now() + sessionData.timeLimit * 1000;
    const newEndTime = Timestamp.fromMillis(futureTime);

    try {
      await updateDoc(doc(db, 'sessions', sessionId), {
        status: 'ACTIVE',
        endTime: newEndTime,
      });
    } catch (error) {
      console.error('Error initializing hack:', error);
    }
  };

  /**
   * Check if all layers are solved. If yes and session is ACTIVE -> mark SUCCESS
   * If timeLeft <= 0 and session is ACTIVE -> mark FAILURE
   */
  const checkAllSolved = useCallback(async () => {
    if (!sessionData) return;
    if (successOrFailRef.current) return;

    // Are all layers solved?
    const allSolved = layers.length > 0 && layers.every((layer) => layer.status === 'SOLVED');

    if (sessionData.status === 'ACTIVE') {
      if (allSolved) {
        try {
          await updateDoc(doc(db, 'sessions', sessionId), {
            status: 'SUCCESS',
          });
          successOrFailRef.current = true;
        } catch (err) {
          console.error('Error setting success:', err);
        }
      } else if (timeLeft <= 0) {
        try {
          await updateDoc(doc(db, 'sessions', sessionId), {
            status: 'FAILURE',
          });
          successOrFailRef.current = true;
        } catch (err) {
          console.error('Error setting failure:', err);
        }
      }
    }
  }, [layers, timeLeft, sessionData, sessionId]);

  /**
   * Local countdown timer if hackPhase=ACTIVE
   */
  useEffect(() => {
    if (hackPhase !== 'ACTIVE') return;
    if (!sessionData?.endTime) return;

    const intervalId = setInterval(() => {
      const endMillis = sessionData.endTime.toMillis();
      const nowMillis = Date.now();
      const remaining = Math.floor((endMillis - nowMillis) / 1000);

      setTimeLeft(remaining > 0 ? remaining : 0);

      // If time is up and STILL active, set failure
      if (remaining <= 0 && sessionData.status === 'ACTIVE') {
        updateDoc(doc(db, 'sessions', sessionId), {
          status: 'FAILURE',
        }).catch(console.error);
      }
    }, 1000);

    return () => clearInterval(intervalId);
  }, [hackPhase, sessionData, sessionId]);

  /**
   * Each time layers or hackPhase changes, check for success/failure
   */
  useEffect(() => {
    if (hackPhase === 'ACTIVE') {
      checkAllSolved();
    }
  }, [layers, hackPhase, checkAllSolved]);

  // ======================
  //  PARENT / CHILD SIDEBARS
  // ======================

  const handleGoToParent = () => {
    if (!parentSessionData) return;
    navigate(`/session/${parentSessionData.id}`);
  };

  const handleGoToChild = (childId) => {
    navigate(`/session/${childId}`);
  };

  // ======================
  //  GROUPING LOGIC
  // ======================
  // We'll find the first group that is not fully solved
  // Groups <= that group are "unlocked"; groups > that group are "locked"
  const groupedLayers = {};
  layers.forEach((layer) => {
    const g = layer.group || 0;
    if (!groupedLayers[g]) groupedLayers[g] = [];
    groupedLayers[g].push(layer);
  });
  // Sort group keys (numbers)
  const sortedGroupKeys = Object.keys(groupedLayers)
    .map((k) => parseInt(k))
    .sort((a, b) => a - b);

  let firstIncompleteGroup = null;
  for (let g of sortedGroupKeys) {
    const allSolved = groupedLayers[g].every((l) => l.status === 'SOLVED');
    if (!allSolved) {
      firstIncompleteGroup = g;
      break;
    }
  }
  if (firstIncompleteGroup === null && sortedGroupKeys.length > 0) {
    // Means all groups are solved -> last group was incomplete, but now solved
    // You might not need special handling here, just means everything is solved
    // Optionally set firstIncompleteGroup to the highest group or something
  }

  // Helper function to see if a group is unlocked
  const isGroupUnlocked = (groupNumber) => {
    if (firstIncompleteGroup == null) {
      // everything solved => groups are all "unlocked" if we want
      return true;
    }
    return groupNumber <= firstIncompleteGroup;
  };

  // Determine dynamic theme class from sessionData.theme
  const themeClass = sessionData?.theme ? `theme-${sessionData.theme}` : 'theme-default';

  // If session is locked (due to parent not success), show locked screen
  if (isLocked) {
    return (
      <div className={`main-hacking-screen ${themeClass}`}>
        <div className="locked-session-message">
          <h1>Session Locked</h1>
          <p>You must complete the parent session before accessing this hack.</p>
          {parentSessionData && <button onClick={handleGoToParent}>Go to Parent: {parentSessionData.name}</button>}
        </div>
      </div>
    );
  }

  // If we have no session data at all (doc doesn't exist or not loaded), fallback
  if (!sessionData) {
    return (
      <div className="main-hacking-screen">
        <p>Loading session data...</p>
      </div>
    );
  }

  // ============== RENDER LAYOUT ==============
  return (
    <div className={`main-hacking-screen ${themeClass}`}>
      <div className="main-container">
        {/* LEFT COLUMN: Parent Sessions */}
        <div className="parent-sessions-column">
          {parentSessionData && (
            <button className="parent-session-button" onClick={handleGoToParent}>
              {parentSessionData.name}
            </button>
          )}
        </div>

        {/* CENTER COLUMN: Session Info & Layers */}
        <div className="layers-column">
          {/* Various states: INIT, ACTIVE, SUCCESS, FAILURE */}
          {hackPhase === 'INIT' && (
            <div className="init-phase">
              <div>
                <div>
                  <img className="theme-logo" src={`/themes/${sessionData.theme || 'default'}/logo.png`} />
                </div>
                <h1>Hacking Session: {sessionData.name}</h1>
              </div>
              <p>Time Limit: {sessionData.timeLimit || 60} seconds</p>
              <button onClick={handleInitializeHack}>Initialize Hack</button>
            </div>
          )}

          {hackPhase === 'ACTIVE' && (
            <div className="active-phase">
              <div>
                <div>
                  <img className="theme-logo" src={`/themes/${sessionData.theme || 'default'}/logo.png`} />
                </div>
                <h1>Hacking Session: {sessionData.name}</h1>
              </div>
              <h2>Time Left: {timeLeft}s</h2>

              {/* Groups in ascending order */}
              {sortedGroupKeys.map((g) => {
                const groupLayers = groupedLayers[g];
                const unlocked = isGroupUnlocked(g);

                return (
                  <div key={g} id={`group-${g}`} className={`group-section ${unlocked ? 'unlocked' : 'locked'}`}>
                    <h3>Group {g}</h3>
                    <div className="layer-grid">
                      {groupLayers.map((layer) => {
                        // fade out if solved
                        const solvedClass = layer.status === 'SOLVED' ? 'solved' : '';
                        return (
                          <div key={layer.id} className={`layer-item ${solvedClass}`}>
                            <div className="layer-header">
                              <h4>
                                {layer.puzzleType.toUpperCase()} - Difficulty {layer.difficulty}
                              </h4>
                              <p>Status: {layer.status}</p>
                            </div>

                            {/* If locked group or solved layer? hide QR? up to you */}
                            {unlocked && layer.status !== 'SOLVED' ? (
                              <div className="layer-qr">
                                <QRCode
                                  value={`${window.location.origin}/puzzle/${sessionId}/${layer.id}`}
                                  size={128}
                                />
                              </div>
                            ) : (
                              <div className="qr-placeholder">Locked or Solved</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {hackPhase === 'SUCCESS' && (
            <div className={`main-hacking-screen ${themeClass} success-phase`}>
              <div>
                <div>
                  <img className="theme-logo" src={`/themes/${sessionData.theme || 'default'}/logo.png`} />
                </div>
                <h1>Hacking Session: {sessionData.name}</h1>
              </div>
              <div dangerouslySetInnerHTML={{ __html: sessionData.completionContent }} />
            </div>
          )}

          {hackPhase === 'FAILURE' && (
            <div className={`main-hacking-screen ${themeClass} failure-phase`}>
              <div>
                <div className="theme-logo">
                  <img className="theme-logo" src={`/themes/${sessionData.theme || 'default'}/logo.png`} />
                </div>
                <h1>Hacking Session: {sessionData.name}</h1>
              </div>
              <p>Some layers remained unsolved when time ran out.</p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Child Sessions (only if success) */}
        <div className="child-sessions-column">
          {/* If we're in success or have success status, show child sessions */}
          {sessionData.status === 'SUCCESS' && childSessions.length > 0 && (
            <div className="child-session-list">
              <h3>Child Sessions</h3>
              {childSessions.map((child) => (
                <button key={child.id} onClick={() => handleGoToChild(child.id)} className="child-session-button">
                  {child.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MainHackingScreen;
