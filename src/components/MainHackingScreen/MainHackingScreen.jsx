import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { doc, collection, onSnapshot, updateDoc, Timestamp } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import QRCode from "react-qr-code";
import "./MainHackingScreen.css";

function MainHackingScreen() {
  const { sessionId } = useParams();

  // Store the session data (timeLimit, name, etc.)
  const [sessionData, setSessionData] = useState(null);

  // Store an array of puzzle layers
  const [layers, setLayers] = useState([]);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(0);

  // Hack phase: "INIT" | "ACTIVE" | "SUCCESS" | "FAILURE"
  const [hackPhase, setHackPhase] = useState("INIT");

  // Track if we've already determined success or failure (to avoid re-running logic)
  const successOrFailRef = useRef(false);

  // 1. Subscribe to session + layers from Firestore
  useEffect(() => {
    if (!sessionId) return;

    const sessionRef = doc(db, "sessions", sessionId);
    const layersRef = collection(db, "sessions", sessionId, "layers");

    // Subscribe to session doc
    const unsubscribeSession = onSnapshot(sessionRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setSessionData(data);
      
        // Derive hackPhase from the Firestore status
        if (data.status === "ACTIVE") {
          setHackPhase("ACTIVE");
      
          // If we have an endTime in Firestore, calculate the local timeLeft
          if (data.endTime) {
            const endMillis = data.endTime.toMillis(); // Firestore Timestamp -> JS milliseconds
            const nowMillis = Date.now();
            const remaining = Math.floor((endMillis - nowMillis) / 1000); // in seconds
            setTimeLeft(remaining > 0 ? remaining : 0);
          }
        } else if (data.status === "SUCCESS") {
          setHackPhase("SUCCESS");
        } else if (data.status === "FAILURE") {
          setHackPhase("FAILURE");
        } else {
          // default to "INIT" if status is something else or undefined
          setHackPhase("INIT");
        }
      } else {
        // Session doc not found
        setSessionData(null);
      }
    });

    // Subscribe to layers sub-collection
    const unsubscribeLayers = onSnapshot(layersRef, (querySnapshot) => {
      const layerArray = [];
      querySnapshot.forEach((layerDoc) => {
        layerArray.push({
          id: layerDoc.id,
          ...layerDoc.data(),
        });
      });
      setLayers(layerArray);
    });

    // Cleanup
    return () => {
      unsubscribeSession();
      unsubscribeLayers();
    };
  }, [sessionId, hackPhase]);

  // 2. Start the hack (set hackPhase="ACTIVE" and start timer)
  const handleInitializeHack = async () => {
    if (!sessionData || !sessionData.timeLimit) return;
  
    // Calculate a future end time in milliseconds.
    const futureTime = Date.now() + sessionData.timeLimit * 1000;
  
    // Convert to a Firestore Timestamp
    const newEndTime = Timestamp.fromMillis(futureTime);
  
    await updateDoc(doc(db, "sessions", sessionId), {
      status: "ACTIVE",
      endTime: newEndTime,
    });
  };
    
  // 3. Check if all layers are solved
  //    If yes, and hackPhase is ACTIVE, set hackPhase="SUCCESS"
  //    Or if time ran out (timeLeft <= 0), set hackPhase="FAILURE"
  //    We do it in a separate function so we can call it from multiple places
  const checkAllSolved = useCallback(async () => {
    // If we've already set success/failure, skip
    if (successOrFailRef.current) return;
  
    // Determine if all layers are solved
    const allSolved =
      layers.length > 0 && layers.every((layer) => layer.status === "SOLVED");
  
    // We only evaluate success/failure if the session is currently ACTIVE
    if (sessionData?.status === "ACTIVE") {
      // If all are solved, mark session as SUCCESS in Firestore
      if (allSolved) {
        await updateDoc(doc(db, "sessions", sessionId), {
          status: "SUCCESS",
        });
        successOrFailRef.current = true; // Prevent multiple updates
      }
      // Otherwise, if time has run out, mark session as FAILURE
      else if (timeLeft <= 0) {
        await updateDoc(doc(db, "sessions", sessionId), {
          status: "FAILURE",
        });
        successOrFailRef.current = true; // Prevent multiple updates
      }
    }
  }, [layers, timeLeft, sessionData, sessionId]);
    
  // 4. Run a countdown if hackPhase is "ACTIVE"
  //    When timeLeft hits 0, check if any layers are unsolved -> "FAILURE"
  //    (unless they've all been solved and we’re already in "SUCCESS")
  useEffect(() => {
    if (hackPhase !== "ACTIVE") return;
    if (!sessionData?.endTime) return;
  
    const intervalId = setInterval(() => {
      const endMillis = sessionData.endTime.toMillis();
      const nowMillis = Date.now();
      const remaining = Math.floor((endMillis - nowMillis) / 1000);
  
      setTimeLeft(remaining > 0 ? remaining : 0);
  
      // If time is up (<= 0) and session is still "ACTIVE", mark it as "FAILURE"
      if (remaining <= 0 && sessionData.status === "ACTIVE") {
        // only do this if you want the client to forcibly set failure.
        // If you prefer a GM or puzzle to do it, skip this.
        updateDoc(doc(db, "sessions", sessionId), {
          status: "FAILURE",
        }).catch(console.error);
      }
    }, 1000);
  
    return () => clearInterval(intervalId);
  }, [hackPhase, sessionData?.endTime, sessionData?.status, sessionId]);

  // 5. Also run checkAllSolved on every layer update
  useEffect(() => {
    if (hackPhase === "ACTIVE") {
      checkAllSolved();
    }
  }, [layers, hackPhase, checkAllSolved]);

  // 6. Render different UIs based on hackPhase
  if (!sessionData) {
    return (
      <div className="main-hacking-screen">
        <p>Loading session data...</p>
      </div>
    );
  }

  switch (hackPhase) {
    case "INIT":
      return (
        <div className="main-hacking-screen init-phase">
          <h1>Hacking Session: {sessionData.name}</h1>
          <p>Time Limit: {sessionData.timeLimit || 60} seconds</p>
          <button className="initialize-btn" onClick={handleInitializeHack}>
            Initialize Hack
          </button>
        </div>
      );

    case "ACTIVE":
      return (
        <div className="main-hacking-screen active-phase">
          <h1>Hacking Session: {sessionData.name}</h1>
          <h2>Time Left: {timeLeft}s</h2>
          <div className="layer-grid">
            {layers.map((layer) => (
              <div key={layer.id} className="layer-item">
                <div className="layer-header">
                  <h3>
                    {layer.puzzleType.toUpperCase()} - Difficulty {layer.difficulty}
                  </h3>
                  <p>Status: {layer.status}</p>
                </div>
                <div className="layer-qr">
                  <QRCode
                    value={`${window.location.origin}/puzzle/${sessionId}/${layer.id}`}
                    size={128}
                  />
                  <p>Scan to solve</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "SUCCESS":
      return (
        <div className="main-hacking-screen success-phase">
          <h1>Hack Succeeded!</h1>
          <p>All layers were solved in time.</p>
        </div>
      );

    case "FAILURE":
      return (
        <div className="main-hacking-screen failure-phase">
          <h1>Hack Failed!</h1>
          <p>Some layers remained unsolved when time ran out.</p>
        </div>
      );

    default:
      return null;
  }
}

export default MainHackingScreen;
