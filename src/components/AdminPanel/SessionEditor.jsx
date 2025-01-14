import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    doc, 
    updateDoc, 
    collection, 
    onSnapshot,
    getDocs, 
    addDoc, 
    deleteDoc 
  } from 'firebase/firestore';
  import { db } from '../../firebaseConfig';
  import './SessionEditor.css';

  
  // Puzzle types & difficulty labels from previous examples
  const PUZZLE_TYPES = [
    { value: 'sequence', label: 'Sequence' },
    { value: 'frequencyTuning', label: 'Frequency Tuning' },
    { value: 'logic', label: 'Logic Puzzle' },
  ];
  
  const DIFFICULTY_LABELS = {
    1: 'Basic',
    2: 'Intermediate',
    3: 'Complex',
    4: 'Intricate',
    5: 'Inscrutable'
  };
  
  function SessionEditor({ sessionId, onSessionUpdated }) {
    // --- Session State ---
    const [sessionData, setSessionData] = useState(null);
    const [name, setName] = useState('');
    const [timeLimit, setTimeLimit] = useState(300);
    const [status, setStatus] = useState('ACTIVE');
    const [isLoading, setIsLoading] = useState(true);
  
    // --- Layers State ---
    const [layers, setLayers] = useState([]);
    const [isLayersLoading, setIsLayersLoading] = useState(false);
  
    // --- New Layer Form ---
    const [newLayerPuzzleType, setNewLayerPuzzleType] = useState('sequence');
    const [newLayerDifficulty, setNewLayerDifficulty] = useState(1);
  
    // --- Delete Confirmation Modal State ---
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const navigate = useNavigate();
    const [dirty, setDirty] = useState(false);
  
    useEffect(() => {
      if (!sessionId) return;
    
      // Listen to the session doc
      const sessionDocRef = doc(db, 'sessions', sessionId);
      const unsubscribeSession = onSnapshot(sessionDocRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setSessionData(data);
          setName(data.name || '');
          setTimeLimit(data.timeLimit || 300);
          setStatus(data.status || 'ACTIVE');
          setIsLoading(false);
        } else {
          console.error('Session does not exist');
          setIsLoading(false);
        }
      });
    
      // Listen to the layers sub-collection
      const layersRef = collection(db, 'sessions', sessionId, 'layers');
      const unsubscribeLayers = onSnapshot(layersRef, (layersSnap) => {
        const layerData = layersSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setLayers(layerData);
        setIsLayersLoading(false);
      });
    
      // Cleanup both listeners when unmounting or sessionId changes
      return () => {
        unsubscribeSession();
        unsubscribeLayers();
      };
    }, [sessionId]);
  
    // --- Save Session Changes ---
    const handleSaveSession = async () => {
      try {
        const sessionDocRef = doc(db, 'sessions', sessionId);
        await updateDoc(sessionDocRef, {
            name,
            timeLimit,
            status,
          });
          setDirty(false); 
        onSessionUpdated({
          id: sessionId,
          name,
          timeLimit,
          status,
        });
        alert('Session updated!');
      } catch (error) {
        console.error('Error updating session:', error);
      }
    };
  
    // --- Layer Operations ---
    const handleAddLayer = async () => {
      try {
        const layersRef = collection(db, 'sessions', sessionId, 'layers');
        await addDoc(layersRef, {
          puzzleType: newLayerPuzzleType,
          difficulty: newLayerDifficulty,
          status: 'LOCKED',
        });
        await reloadLayers();
  
        // Reset the form if desired
        setNewLayerPuzzleType('sequence');
        setNewLayerDifficulty(1);
      } catch (error) {
        console.error('Error adding layer:', error);
      }
    };
  
    const reloadLayers = async () => {
      const layersRef = collection(db, 'sessions', sessionId, 'layers');
      const layersSnap = await getDocs(layersRef);
      const layerData = layersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setLayers(layerData);
    };
  
    const handleDeleteLayer = async (layerId) => {
      try {
        const layerDocRef = doc(db, 'sessions', sessionId, 'layers', layerId);
        await deleteDoc(layerDocRef);
        await reloadLayers();
      } catch (error) {
        console.error('Error deleting layer:', error);
      }
    };
  
    const handleUpdateLayerStatus = async (layerId, newStatus) => {
      try {
        const layerDocRef = doc(db, 'sessions', sessionId, 'layers', layerId);
        await updateDoc(layerDocRef, { status: newStatus });
        await reloadLayers();
      } catch (error) {
        console.error('Error updating layer status:', error);
      }
    };
  
    // --- DELETE SESSION (with sub-collection layers) ---
    const handleDeleteSessionClicked = () => {
      // Show the confirmation modal
      setShowDeleteModal(true);
    };
  
    const handleConfirmDeleteSession = async () => {
      try {
        // 1. Delete all layers
        const layersRef = collection(db, 'sessions', sessionId, 'layers');
        const layersSnap = await getDocs(layersRef);
        for (const layerDoc of layersSnap.docs) {
          await deleteDoc(doc(db, 'sessions', sessionId, 'layers', layerDoc.id));
        }
  
        // 2. Delete the session itself
        const sessionDocRef = doc(db, 'sessions', sessionId);
        await deleteDoc(sessionDocRef);
  
        // 3. Optionally: notify parent or reset UI. 
        //    If we have a callback like `onSessionDeleted`, call it.
        //    Or we can call onSessionUpdated with null, or do something else.
        alert(`Session ${sessionId} deleted (including all layers).`);
  
        // Here, you might do something like navigate away or 
        // set selectedSession to null in the parent. For now:
        onSessionUpdated({ id: sessionId, deleted: true });
  
      } catch (error) {
        console.error('Error deleting session:', error);
      } finally {
        // Hide modal either way
        setShowDeleteModal(false);
      }
    };
  
    const handleCancelDeleteSession = () => {
      setShowDeleteModal(false);
    };
  
    // UI placeholders for icons 
    const getPuzzleTypeIcon = (type) => {
      switch (type) {
        case 'sequence':
          return '🔢';
        case 'frequencyTuning':
          return '📶';
        case 'logic':
          return '🧠';
        default:
          return '❓';
      }
    };

  return (
    
    <div style={{ padding: '16px' }}>
      <h2>Editing Session: {sessionId}</h2>

      {isLoading ? (
        <p>Loading session...</p>
      ) : sessionData ? (
        <div>

        <div className="session-details-container">
        {/* Left side (on desktop) or top (on mobile) */}
        <div className="session-form">
            {/* Session Fields */}
          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontWeight: 'bold' }}>Session Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setDirty(true);
              }}
                style={{ width: '100%', padding: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontWeight: 'bold' }}>Time Limit (sec)</label>
            <input
              type="number"
              value={timeLimit}
              onChange={(e) => {
                setTimeLimit(Number(e.target.value));
                setDirty(true);
              }}
              style={{ width: '100%', padding: '4px' }}
            />
          </div>

          <div style={{ marginBottom: '8px' }}>
            <label style={{ display: 'block', fontWeight: 'bold' }}>Status</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setDirty(true);
              }}
              style={{ width: '100%', padding: '4px' }}
            >
              <option value="INIT">INIT</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILURE">FAILURE</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
          {dirty ? (
            // If dirty, show the Save button
            <button onClick={handleSaveSession}>
                Save Session Changes
            </button>
            ) : (
            // If not dirty, show the Start button
            <button 
                style={{ backgroundColor: 'green', color: '#fff' }}
                onClick={() => navigate(`/session/${sessionId}`)}
            >
                Start
            </button>
            )}
            <button 
              onClick={handleDeleteSessionClicked} 
              style={{ marginLeft: '16px', backgroundColor: '#d32f2f', color: '#fff' }}
            >
              Delete Session
            </button>
          </div>

          <hr style={{ margin: '16px 0' }} />

          {/* Layers Section */}
          <h3>Layers</h3>

          {/* Add New Layer Form */}
          <div 
            style={{
              display: 'flex',
              gap: '8px',
              marginBottom: '16px',
              flexWrap: 'wrap'
            }}
          >
            <div>
              <label style={{ display: 'block', fontWeight: 'bold' }}>Puzzle Type</label>
              <select
                value={newLayerPuzzleType}
                onChange={(e) => setNewLayerPuzzleType(e.target.value)}
              >
                {PUZZLE_TYPES.map(pt => (
                  <option key={pt.value} value={pt.value}>
                    {pt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 'bold' }}>Difficulty</label>
              <select
                value={newLayerDifficulty}
                onChange={(e) => setNewLayerDifficulty(Number(e.target.value))}
              >
                {/* For instance, 1..5 mapped to your DIFFICULTY_LABELS */}
                {Object.entries(DIFFICULTY_LABELS).map(([numValue, label]) => (
                  <option key={numValue} value={numValue}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ alignSelf: 'flex-end' }}>
              <button onClick={handleAddLayer}>Add Layer</button>
            </div>
          </div>
        </div>

        {/* Right side (on desktop) or below (on mobile) */}
        <div className="layer-cards-container">
                      {/* Show Layers in a Flex/Grid layout */}
          {isLayersLoading ? (
            <p>Loading layers...</p>
          ) : layers.length === 0 ? (
            <p>No layers yet.</p>
          ) : (
            <div 
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              {layers.map(layer => {
                const icon = getPuzzleTypeIcon(layer.puzzleType);
                const difficultyLabel = DIFFICULTY_LABELS[layer.difficulty] || 'Unknown';

                return (
                  <div 
                    key={layer.id} className="layer-card"
                    
                  >
                    {/* Icon & Puzzle Type */}
                    <div style={{ marginBottom: '8px', fontSize: '1.2rem' }}>
                      <span style={{ marginRight: '8px' }}>{icon}</span>
                      <strong>{layer.puzzleType}</strong>
                    </div>

                    {/* Difficulty */}
                    <div>
                      Difficulty: <strong>{difficultyLabel}</strong>
                    </div>

                    {/* Status */}
                    <div style={{ marginTop: '8px' }}>
                      Status: <strong>{layer.status}</strong>
                    </div>

                    {/* Actions (Update Status, Delete) */}
                    <div style={{ marginTop: '8px' }}>
                      {layer.status !== 'SOLVED' && (
                        <button 
                          onClick={() => handleUpdateLayerStatus(layer.id, 'SOLVED')} 
                          style={{ marginRight: '8px' }}
                        >
                          Unlock
                        </button>
                      )}
                      {layer.status !== 'LOCKED' && (
                        <button 
                          onClick={() => handleUpdateLayerStatus(layer.id, 'LOCKED')}
                          style={{ marginRight: '8px' }}
                        >
                          Lock
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeleteLayer(layer.id)}
                        style={{ backgroundColor: '#f44336', color: '#fff' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        </div>

          {/* Confirmation Modal (Delete Session) */}
          {showDeleteModal && (
            <div 
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999
              }}
            >
              <div 
                style={{
                  backgroundColor: '#fff',
                  padding: '16px',
                  borderRadius: '8px',
                  maxWidth: '400px',
                  textAlign: 'center'
                }}
              >
                <h4>Confirm Deletion</h4>
                <p>Are you sure you want to delete this session and all its layers?</p>
                <button 
                  onClick={handleConfirmDeleteSession} 
                  style={{ marginRight: '8px', backgroundColor: 'rgb(68, 68, 68)', color: '#fff' }}
                >
                  Yes, Delete
                </button>
                <button onClick={handleCancelDeleteSession}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p>No session found.</p>
      )}
    </div>
    
  );
}

export default SessionEditor;
