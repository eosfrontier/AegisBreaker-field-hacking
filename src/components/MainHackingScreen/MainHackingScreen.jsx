import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, collection, query, where, onSnapshot, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import './MainHackingScreen.css';
import HexGrid from './HexGrid';

function MainHackingScreen() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  // Session data, including theme, status, parentSessionId, etc.
  const [sessionData, setSessionData] = useState(null);
  // Parent session data (if any)
  const [parentSessionData, setParentSessionData] = useState(null);
  // Child sessions (if this session is a parent for them)
  const [childSessions, setChildSessions] = useState([]);
  // Lock state if parent is incomplete
  const [isLocked, setIsLocked] = useState(false);

  // Layers for this session
  const [layers, setLayers] = useState([]);

  // Local time left in seconds
  const [timeLeft, setTimeLeft] = useState(0);

  // Hack phase: "INIT" | "ACTIVE" | "SUCCESS" | "FAILURE"
  const [hackPhase, setHackPhase] = useState('INIT');

  // Prevent multiple success/failure updates
  const successOrFailRef = useRef(false);

  // We’ll store the "currently displayed group" in state for scroll logic
  // This will be the "first incomplete group" or null if all solved
  const [currentGroup, setCurrentGroup] = useState(null);
  const previousGroupRef = useRef(null); // track old group to detect changes

  /**
   * Subscribe to:
   * 1) Current session doc
   * 2) Parent session (if parentSessionId)
   * 3) Child sessions (where parentSessionId == sessionId)
   * 4) Layers sub-collection
   */
  useEffect(() => {
    if (!sessionId) return;

    // --- Current Session Doc ---
    const sessionRef = doc(db, 'sessions', sessionId);
    const unsubSession = onSnapshot(sessionRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSessionData({ id: docSnap.id, ...data });

        // Determine local hackPhase from doc's status
        if (data.status === 'ACTIVE') {
          setHackPhase('ACTIVE');
          // Compute local timeLeft if endTime is present
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
          setHackPhase('INIT');
        }

        // --- Parent Session ---
        if (data.parentSessionId) {
          const parentRef = doc(db, 'sessions', data.parentSessionId);
          const parentSnap = await getDoc(parentRef);
          if (parentSnap.exists()) {
            const parentData = parentSnap.data();
            setParentSessionData({ id: parentSnap.id, ...parentData });
            // Lock if parent not success
            if (parentData.status !== 'SUCCESS') {
              setIsLocked(true);
            } else {
              setIsLocked(false);
            }
          } else {
            setParentSessionData(null);
            setIsLocked(false);
          }
        } else {
          setParentSessionData(null);
          setIsLocked(false);
        }
      } else {
        console.warn('Session doc does not exist or was removed');
        setSessionData(null);
      }
    });

    // --- Child Sessions ---
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

    // --- Layers Subscription ---
    const layersRef = collection(db, 'sessions', sessionId, 'layers');
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
        if (a.group !== b.group) {
          return a.group - b.group;
        }
        if (a.createdAt && b.createdAt) {
          return a.createdAt.toMillis() - b.createdAt.toMillis();
        }
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
   * Initialize Hack: set status=ACTIVE and endTime in Firestore
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
   * Check if all layers are solved. If yes & session active -> success
   * If timeLeft <= 0 & session active -> failure
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
   * Local countdown if hackPhase=ACTIVE
   */
  useEffect(() => {
    if (hackPhase !== 'ACTIVE') return;
    if (!sessionData?.endTime) return;

    const intervalId = setInterval(() => {
      const endMillis = sessionData.endTime.toMillis();
      const nowMillis = Date.now();
      const remaining = Math.floor((endMillis - nowMillis) / 1000);

      setTimeLeft(remaining > 0 ? remaining : 0);

      // If time is up and still active -> failure
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

  // ============== Parent/Child Navigation ==============
  const handleGoToParent = () => {
    if (!parentSessionData) return;
    navigate(`/session/${parentSessionData.id}`);
  };
  const handleGoToChild = (childId) => {
    navigate(`/session/${childId}`);
  };

  // ============== GROUPING LOGIC ==============
  // 1) Group layers by group number
  const groupedLayers = {};
  layers.forEach((layer) => {
    const g = layer.groupNumber || 0;
    if (!groupedLayers[g]) groupedLayers[g] = [];
    groupedLayers[g].push(layer);
  });
  // 2) Sort the group keys
  const sortedGroupKeys = Object.keys(groupedLayers)
    .map(Number)
    .sort((a, b) => a - b);

  // 3) Find the first incomplete group
  //    "Incomplete" means not all layers are solved
  //    If all groups are solved, firstIncompleteGroup = null
  let firstIncompleteGroup = null;
  for (let g of sortedGroupKeys) {
    const groupIsAllSolved = groupedLayers[g].every((l) => l.status === 'SOLVED');
    if (!groupIsAllSolved) {
      firstIncompleteGroup = g;
      break;
    }
  }

  let nextGroup = null;
  if (firstIncompleteGroup != null) {
    // Find the index of firstIncompleteGroup in sortedGroupKeys
    const idx = sortedGroupKeys.indexOf(firstIncompleteGroup);
    // Next group is the next index in sortedGroupKeys
    if (idx >= 0 && idx < sortedGroupKeys.length - 1) {
      nextGroup = sortedGroupKeys[idx + 1];
    }
  }

  // Our "currentGroup" is firstIncompleteGroup if it exists
  // If all are solved, currentGroup = null
  // We'll store that in local state to handle scroll & transitions
  useEffect(() => {
    // If everything is solved, there's no incomplete group
    if (firstIncompleteGroup == null) {
      setCurrentGroup(null);
      return;
    }
    setCurrentGroup(firstIncompleteGroup);
  }, [firstIncompleteGroup]);

  // 4) Automatically scroll to newly unlocked group
  useEffect(() => {
    if (currentGroup && previousGroupRef.current !== currentGroup) {
      // group changed, scroll
      const el = document.getElementById(`group-${currentGroup}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
    previousGroupRef.current = currentGroup;
  }, [currentGroup]);

  // ============== THEME CLASS ==============
  const themeClass = sessionData?.theme ? `theme-${sessionData.theme}` : 'theme-default';

  // If session locked by parent
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

  // If no session data loaded
  if (!sessionData) {
    return (
      <div className="main-hacking-screen">
        <p>Loading session data...</p>
      </div>
    );
  }

  // ============== RENDER ==============
  return (
    <div className={`main-hacking-screen ${themeClass}`}>
      <div className="main-container">
        {/* LEFT: Parent Session */}
        <div className="parent-sessions-column">
          {parentSessionData && (
            <button className="parent-session-button" onClick={handleGoToParent}>
              {parentSessionData.name}
            </button>
          )}
        </div>

        {/* CENTER: Layers or final states */}
        <div className="layers-column">
          {/* INIT PHASE */}
          {hackPhase === 'INIT' && (
            <div className="init-phase">
              <div className="header-box">
                <div>
                  <img className="theme-logo" src={`/themes/${sessionData.theme || 'default'}/logo.png`} />
                </div>
                <h1>Hacking Session: {sessionData.name}</h1>
              </div>
              <p>Time Limit: {sessionData.timeLimit || 60} seconds</p>
              <button className="initialize-btn" onClick={handleInitializeHack}>
                Initialize Hack
              </button>
            </div>
          )}
          {/* ACTIVE PHASE */}
          {hackPhase === 'ACTIVE' && (
            <div className="active-phase">
              <div className="header-box">
                <div>
                  <img className="theme-logo" src={`/themes/${sessionData.theme || 'default'}/logo.png`} />
                </div>
                <h1>Hacking Session: {sessionData.name}</h1>
              </div>
              <h2>Time Left: {timeLeft}s</h2>

              {/* CURRENT GROUP (active) */}
              {currentGroup != null && (
                <div id={`group-${currentGroup}`} className="group-section unlocked">
                  <h3>Group {currentGroup}</h3>
                  <HexGrid
                    layers={groupedLayers[currentGroup]}
                    sessionId={sessionId}
                    variant="active" // pass a prop to HexGrid so it knows it's the active group
                  />
                </div>
              )}

              {/* NEXT GROUP (preview) */}
              {nextGroup != null && (
                <div id={`group-${nextGroup}`} className="group-section upcoming">
                  <h3>Upcoming Group {nextGroup}</h3>
                  <HexGrid
                    layers={groupedLayers[nextGroup]}
                    sessionId={sessionId}
                    variant="preview" // pass a prop to handle locked/hidden puzzle info
                  />
                </div>
              )}

              {/* If currentGroup === null -> all solved? or waiting on success? */}
              {currentGroup == null && <h2>All groups solved or none found.</h2>}
            </div>
          )}

          {/* If all groups are solved => no currentGroup => success check might happen soon */}
          {hackPhase === 'ACTIVE' && currentGroup == null && (
            <div className="active-phase">
              <h2>All groups solved? Waiting for status update...</h2>
            </div>
          )}

          {/* SUCCESS / FAILURE */}
          {hackPhase === 'SUCCESS' && (
            <div className="success-phase">
              <div className="theme-logo">
                <img src={`/themes/${sessionData.theme}/logo.png`} alt="Theme Logo" />
              </div>
              <h1>Hack Succeeded!</h1>
              <p>All layers were solved in time.</p>
            </div>
          )}
          {hackPhase === 'FAILURE' && (
            <div className="failure-phase">
              <div className="theme-logo">
                <img src={`/themes/${sessionData.theme}/logo.png`} alt="Theme Logo" />
              </div>
              <h1>Hack Failed!</h1>
              <p>Some layers remained unsolved when time ran out.</p>
            </div>
          )}
        </div>

        {/* RIGHT: Child Sessions if success */}
        <div className="child-sessions-column">
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
