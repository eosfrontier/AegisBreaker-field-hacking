import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { doc, collection, query, where, onSnapshot, updateDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebaseConfig';
import './MainHackingScreen.css';
import HexGrid from './HexGrid';
import { QRCodeCanvas } from 'qrcode.react';
import aquilaLogo from '../../assets/Aquila/logo.png';
import dugoLogo from '../../assets/Dugo/logo.png';
import pendzalLogo from '../../assets/Pendzal/logo.png';
import ekaneshLogo from '../../assets/Ekanesh/logo.png';
import sonaLogo from '../../assets/Sona/logo.png';
import aliensLogo from '../../assets/Aliens/logo.png';
import iccLogo from '../../assets/ICC/logo.png';

import { useScriptContext } from '../scripts/ScriptProvider';

const THEME_LOGOS = {
  ICC: iccLogo,
  Aquila: aquilaLogo,
  Dugo: dugoLogo,
  Pendzal: pendzalLogo,
  Ekanesh: ekaneshLogo,
  Sona: sonaLogo,
  Aliens: aliensLogo,
};

function MainHackingScreen() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

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

  const [profile, setProfile] = useState(null);
  const [startModalOpen, setStartModalOpen] = useState(false);

  // Device guard: phone-sized screens should not view the live console post-start
  const [isMobile, setIsMobile] = useState(false);

  // Local time left in seconds
  const [timeLeft, setTimeLeft] = useState(0);

  // Hack phase: "INIT" | "ACTIVE" | "SUCCESS" | "FAILURE"
  const [hackPhase, setHackPhase] = useState('INIT');

  // Prevent multiple success/failure updates
  const successOrFailRef = useRef(false);
  const [reconRevealed, setReconRevealed] = useState(false);
  const { setScriptContext } = useScriptContext();
  const themeLogoSrc = sessionData?.theme ? THEME_LOGOS[sessionData.theme] : null;

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

  // Reset the terminal flag when a session is restarted or switched.
  useEffect(() => {
    if (!sessionData) return;
    if (sessionData.status === 'INIT' || sessionData.status === 'ACTIVE') {
      successOrFailRef.current = false;
    }
  }, [sessionData?.status, sessionId]);

  // If someone manually set the session back to ACTIVE but the timer was cleared,
  // regenerate an endTime so the countdown runs again.
  useEffect(() => {
    if (!sessionData) return;
    if (sessionData.status !== 'ACTIVE') return;
    if (sessionData.endTime) return;
    if (!sessionData.timeLimit) return;

    const freshEndTime = Timestamp.fromMillis(Date.now() + sessionData.timeLimit * 1000);
    updateDoc(doc(db, 'sessions', sessionId), { endTime: freshEndTime }).catch((err) =>
      console.error('Error restoring endTime for ACTIVE session:', err),
    );
    setTimeLeft(sessionData.timeLimit);
  }, [sessionData?.status, sessionData?.endTime, sessionData?.timeLimit, sessionId]);

  /**
   * Initialize Hack: set status=ACTIVE and endTime in Firestore
   */
  const handleInitializeHack = async () => {
    if (!sessionData || !sessionData.timeLimit) return;
    const futureTime = Date.now() + sessionData.timeLimit * 1000;
    const newEndTime = Timestamp.fromMillis(futureTime);

    try {
      successOrFailRef.current = false; // allow fresh success/failure detection
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
      if (!sessionData.endTime) return; // avoid instant failure if timer was never set

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
  const themeValue = sessionData?.theme;
  const normalizedTheme = themeValue ? themeValue.toLowerCase() : null;
  const themeClass = themeValue ? `theme-${themeValue}` : 'theme-default';
  const playerFaction = profile?.faction || 'neutral';
  const sessionTheme = normalizedTheme || 'neutral';
  const showTimerBar = sessionData?.timeLimit && sessionData.timeLimit < 9999;
  const baseSessionPath = sessionId ? `/session/${sessionId}` : '';
  const startRequested =
    location.pathname.endsWith('/start') || new URLSearchParams(location.search || '').get('start') === '1';
  const startUrl =
    typeof window !== 'undefined' && sessionId ? `${window.location.origin}${baseSessionPath}/start` : '';

  const formatTime = (seconds) => {
    const safe = Math.max(0, seconds || 0);
    const hrs = Math.floor(safe / 3600)
      .toString()
      .padStart(2, '0');
    const mins = Math.floor((safe % 3600) / 60)
      .toString()
      .padStart(2, '0');
    const secs = Math.floor(safe % 60)
      .toString()
      .padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  useEffect(() => {
    const faction = playerFaction || 'neutral';
    document.documentElement.setAttribute('data-faction', faction);
  }, [playerFaction]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('characterInfo');
      if (stored) setProfile(JSON.parse(stored));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(max-width: 820px)');
    const update = (e) => setIsMobile(e.matches);
    setIsMobile(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (hackPhase === 'INIT') {
      setScriptContext({
        id: 'main_preinit',
        api: {
          revealNextGroup: () => setReconRevealed(true),
        },
      });
    } else {
      setScriptContext({ id: null, api: {} });
    }
    return () => setScriptContext({ id: null, api: {} });
  }, [hackPhase, setScriptContext]);

  useEffect(() => {
    if (startRequested && hackPhase === 'INIT') {
      setStartModalOpen(true);
    }
  }, [startRequested, hackPhase]);

  const requiredSkills = useMemo(() => {
    const base = new Set(['initialize']);
    if (Array.isArray(sessionData?.requiredSkills)) {
      sessionData.requiredSkills.forEach((s) => base.add(s));
    }
    if (sessionData?.requiredDeviceSkill) {
      base.add(sessionData.requiredDeviceSkill);
    }
    return base;
  }, [sessionData]);

  const eligibility = useMemo(() => {
    const reasons = [];
    if (!profile) {
      reasons.push('Profile required. Set up your operative on the Home screen.');
    } else {
      if (profile.role !== 'operative') reasons.push('Must be an operative profile.');
      if (!profile.name) reasons.push('Name is required.');
      if (!profile.faction) reasons.push('Faction is required.');
      const skillsList = Array.isArray(profile.skills) ? profile.skills : [];
      requiredSkills.forEach((req) => {
        if (!skillsList.includes(req)) {
          reasons.push(`Requires skill: ${req}`);
        }
      });
    }
    return { ok: reasons.length === 0, reasons };
  }, [profile, requiredSkills]);

  const handleConfirmStart = async () => {
    if (!eligibility.ok) return;
    await handleInitializeHack();
    setStartModalOpen(false);
  };

  // If session locked by parent
  if (isLocked) {
    return (
      <div className={`main-hacking-screen ${themeClass}`}>
        <div className="locked-session-message">
          <h1>Session Locked</h1>
          <p>You must complete the parent session before accessing this hack.</p>
          {parentSessionData && (
            <button onClick={handleGoToParent}>Go to Parent: {parentSessionData.playerName}</button>
          )}
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

  const sessionStarted = hackPhase === 'ACTIVE' || hackPhase === 'SUCCESS' || hackPhase === 'FAILURE';

  // On phones/tablets, block the live console once started
  if (isMobile && sessionStarted) {
    return (
      <div className={`main-hacking-screen ${themeClass}`}>
        <div className="mobile-block">
          <h1>Console Unavailable</h1>
          <p>
            The hacking console must be viewed on a larger display. This session is active; switch to the main screen or
            return home.
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="qh-btn" onClick={() => navigate('/')}>
              Return Home
            </button>
            <button className="qh-btn secondary" onClick={() => navigate('/qr-scanner')}>
              Open Scanner
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============== RENDER ==============
  return (
    <div className={`main-hacking-screen ${themeClass}`} data-player-faction={playerFaction}>
      <div className="session-skin" data-session-theme={sessionTheme}>
        <div className="main-container">
          {/* LEFT: Parent Session */}
          <div className="parent-sessions-column">
            {themeLogoSrc && (
              <img className="theme-logo" src={themeLogoSrc} alt={`${sessionData?.theme || 'Theme'} logo`} />
            )}
            {parentSessionData && (
              <button className="parent-session-button" onClick={handleGoToParent}>
                {parentSessionData.playerName}
              </button>
            )}
          </div>

          {/* CENTER: Layers or final states */}
          <div className="layers-column">
            {/* INIT PHASE */}
            {hackPhase === 'INIT' && (
              <div className="init-phase">
                <div className="header-box">
                  <h1>{sessionData.playerName}</h1>
                </div>
                <p>Time Limit: {sessionData.timeLimit || 60} seconds</p>
                {reconRevealed && nextGroup != null && (
                  <p style={{ color: 'var(--accent-2)' }}>Recon: upcoming group appears to be {nextGroup}.</p>
                )}
                <div className="init-actions">
                  {startUrl && (
                    <div className="start-qr-card">
                      <QRCodeCanvas value={startUrl} size={168} bgColor="#0a0c0f" fgColor="#e5e7eb" level="M" />
                      <p className="start-qr-caption">
                        Scan to start hack. <br /> Requires Initialize Hack skill.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* ACTIVE PHASE */}
            {hackPhase === 'ACTIVE' && (
              <div className="active-phase">
                <div className="header-box">
                  <h1>{sessionData.playerName}</h1>
                </div>
                {showTimerBar && (
                  <div className="timer-bar">
                    <div className="timer-bar-track">
                      <div
                        className="timer-bar-fill"
                        style={{
                          width: sessionData.timeLimit
                            ? `${Math.max(0, Math.min(100, (timeLeft / sessionData.timeLimit) * 100))}%`
                            : '0%',
                        }}
                      />
                      <div className="timer-bar-text">{formatTime(timeLeft)}</div>
                    </div>
                  </div>
                )}

                {/* CURRENT GROUP (active) */}
                {currentGroup != null && (
                  <div id={`group-${currentGroup}`} className="group-section unlocked">
                    <h3>Group {currentGroup}</h3>
                    <HexGrid
                      layers={groupedLayers[currentGroup]}
                      sessionId={sessionId}
                      variant="active" // active group shows full codes
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
                      variant="preview" // preview group stays locked/low emphasis
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
                {sessionData?.completionContent && (
                  <div
                    className="completion-content"
                    dangerouslySetInnerHTML={{ __html: sessionData.completionContent }}
                  />
                )}
              </div>
            )}
            {hackPhase === 'FAILURE' && (
              <div className="failure-phase">
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
                    {child.playerName}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {startModalOpen && hackPhase === 'INIT' && (
        <div className="start-modal-overlay" role="dialog" aria-modal="true">
          <div className="start-modal">
            <h2>Start Hack</h2>
            {!eligibility.ok ? (
              <>
                <p className="start-modal-subtext">
                  You need to complete your profile and required skills before starting. Please complete your profile and rescan.
                </p>
                <ul className="start-requirements">
                  {eligibility.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <div className="start-modal-actions">
                  <button className="qh-btn" onClick={() => navigate('/')}>
                    Go to Home
                  </button>
                  <button className="qh-btn secondary" onClick={() => setStartModalOpen(false)}>
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="start-modal-subtext">Ready to initialize this hack?</p>
                <div className="start-modal-actions">
                  <button className="qh-btn secondary" onClick={() => setStartModalOpen(false)}>
                    Cancel
                  </button>
                  <button className="qh-btn" onClick={handleConfirmStart}>
                    Confirm &amp; Start
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MainHackingScreen;
