import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import './PuzzleScreen.css';
import Typewriter from './Typewriter';
import SequencePuzzle from "./SequencePuzzle";
import { useNavigate } from "react-router-dom";
import UnlockedLockSVG from "../../assets/lock-unlock-icon-22.svg";


const PuzzleScreen = () => {
  const { sessionId, layerId } = useParams();

  const [layerData, setLayerData] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);

  const [fakeDelayComplete, setFakeDelayComplete] = useState(false);

  const navigate = useNavigate();


  useEffect(() => {
    if (!sessionId || !layerId) return;

    // Listen for session doc
    const sessionRef = doc(db, "sessions", sessionId);
    const unsubSession = onSnapshot(sessionRef, (snapshot) => {
      setSessionData(snapshot.data());
    });

    // Listen for layer doc
    const layerRef = doc(db, "sessions", sessionId, "layers", layerId);
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
    if (loading || !layerData) return;

    if (layerData.status === "LOCKED") {
      const layerRef = doc(db, "sessions", sessionId, "layers", layerId);
      updateDoc(layerRef, { status: "IN_PROGRESS" })
        .then(() => {
          console.log("Puzzle set to IN_PROGRESS");
        })
        .catch((err) => {
          console.error("Error setting puzzle to IN_PROGRESS:", err);
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

  if (loading || !fakeDelayComplete) {
    const hackText = `Establishing secure connection...
Bypassing firewall...
Decoding encryption...
Accessing mainframe...`;

    return (
      <div style={{ background: '#262e3e', color: '#fff', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontFamily: 'monospace' }}>
        <Typewriter text={hackText} typingSpeed={20} />
      </div>
    );
  }

  if (loading) {
    return <div>Loading puzzle...</div>;
  }

  // If the session is ended, show a message
  if (sessionData?.status === "FAILURE" || sessionData?.status === "SUCCESS") {
    return <div>The session has ended!</div>;
  }

  // If layer is solved, show a message
  if (layerData?.status === "SOLVED") {
    return     <div className="sequence-puzzle-container">
            <h3>Layer solved</h3>

    {/* Insert your green/transparent unlocked lock SVG here */}
    {/* Example inline style: adjust "width" or "height" as needed */}
    <img 
      src={UnlockedLockSVG}
      alt="Unlocked lock" 
      style={{ opacity: 0.7, color: "green", width: "350px", height: "450px" }}
    />
    
    <button onClick={() => navigate(`*`)}>
      Sever Connection
    </button>
  </div>;
  }

  // If it's still locked, show a quick "Locked" message (though we're already
  // attempting to set it IN_PROGRESS in the effect above).
  if (layerData?.status === "LOCKED") {
    return <div>Checking puzzle status...</div>;
  }

  // Otherwise, if the puzzle is in progress, display the puzzle
  if (layerData?.puzzleType === "sequence") {
    return (
      <SequencePuzzle
        sessionId={sessionId}
        layerId={layerId}
        layerData={layerData}
      />
    );
  }
  if (layerData?.puzzleType === "frequencyTuning") {
    return (
      <SequencePuzzle
        sessionId={sessionId}
        layerId={layerId}
        layerData={layerData}
      />
    );
  }
  if (layerData?.puzzleType === "logic") {
    return (
      <SequencePuzzle
        sessionId={sessionId}
        layerId={layerId}
        layerData={layerData}
      />
    );
  }

  return <div>Unknown puzzle type!</div>;
};

export default PuzzleScreen;
