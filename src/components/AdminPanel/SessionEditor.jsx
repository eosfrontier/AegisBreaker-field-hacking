import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, query, orderBy, updateDoc, collection, onSnapshot, getDocs, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import './SessionEditor.css';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { quillModules, quillFormats } from '../../utils/quillConfig';
import CustomToolbar from '../../utils/quillCustomToolbar';

// Puzzle types & difficulty labels from previous examples
const PUZZLE_TYPES = [
  { value: 'sequence', label: 'Sequence' },
  { value: 'frequencyTuning', label: 'Frequency Tuning' },
  { value: 'logic', label: 'Logic Puzzle' },
  { value: 'masterLock', label: 'Circle Lock' },
  { value: 'signalShunt', label: 'Signal Identifier' },
];

const DIFFICULTY_LABELS = {
  1: 'Basic',
  2: 'Intermediate',
  3: 'Complex',
  4: 'Intricate',
  5: 'Inscrutable',
};

const THEMES = ['ICC', 'Aliens', 'Aquila', 'Dugo', 'Pendzal', 'Sona', 'Ekanesh'];

function SessionEditor({ sessionId, onSessionUpdated, sessions }) {
  // --- Session State ---
  const [sessionData, setSessionData] = useState(null);
  const [name, setName] = useState('');
  const [gmName, setGmName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [timeLimit, setTimeLimit] = useState(300);
  const [theme, setTheme] = useState('');
  const [parentSessionId, setParentSessionId] = useState(null);
  const [status, setStatus] = useState('ACTIVE');
  const [isLoading, setIsLoading] = useState(true);
  const [completionContent, setCompletionContent] = useState('');
  const [newLayerGroupNumber, setNewLayerGroupNumber] = useState(1);

  // --- Layers State ---
  const [layers, setLayers] = useState([]);
  const [isLayersLoading, setIsLayersLoading] = useState(false);

  // --- New Layer Form ---
  const [newLayerPuzzleType, setNewLayerPuzzleType] = useState('sequence');
  const [newLayerDifficulty, setNewLayerDifficulty] = useState(1);

  // --- Delete Confirmation Modal State ---
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // --- modal state:
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [tempCompletionContent, setTempCompletionContent] = useState('');

  const navigate = useNavigate();
  const [dirty, setDirty] = useState(false);
  const canStart = layers.length > 0;

  useEffect(() => {
    if (!sessionId) return;

    // Listen to the session doc
    const sessionDocRef = doc(db, 'sessions', sessionId);
    const unsubscribeSession = onSnapshot(sessionDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setSessionData(data);
        setName(data.name || '');
        setGmName(data.gmName || data.name || '');
        setPlayerName(data.playerName || '');
        setTimeLimit(data.timeLimit || 300);
        setTheme(data.theme || '');
        setParentSessionId(data.parentSessionId || '');
        setStatus(data.status || 'ACTIVE');
        setCompletionContent(data.completionContent || '');
        setIsLoading(false);
      } else {
        console.error('Session does not exist');
        setIsLoading(false);
      }
    });

    // Listen to the layers sub-collection
    const layersCollectionRef = collection(db, 'sessions', sessionId, 'layers');
    const layersQuery = query(layersCollectionRef, orderBy('createdAt'));
    const unsubscribeLayers = onSnapshot(layersQuery, (snap) => {
      const layerData = snap.docs.map((doc) => ({
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
        gmName,
        playerName,
        timeLimit,
        status,
        completionContent,
        theme,
        parentSessionId,
      });
      setDirty(false);
      onSessionUpdated({
        id: sessionId,
        gmName,
        playerName,
        name,
        timeLimit,
        status,
        completionContent,
        theme,
        parentSessionId,
      });
      alert('Session updated!');
    } catch (error) {
      console.error('Error updating session:', error);
    }
  };

  const generateShortId = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';

    const getRandomElement = (arr) => arr[Math.floor(Math.random() * arr.length)];

    const letter = getRandomElement(letters);
    const number = getRandomElement(numbers);

    return `${letter}${number}`;
  };

  // --- Layer Operations ---
  const handleAddLayer = async () => {
    try {
      const layersRef = collection(db, 'sessions', sessionId, 'layers');
      await addDoc(layersRef, {
        puzzleType: newLayerPuzzleType,
        difficulty: newLayerDifficulty,
        shortId: generateShortId(),
        status: 'LOCKED',
        groupNumber: newLayerGroupNumber,
        createdAt: new Date(),
      });
      await reloadLayers();
    } catch (error) {
      console.error('Error adding layer:', error);
    }
  };

  const reloadLayers = async () => {
    const layersCollectionRef = collection(db, 'sessions', sessionId, 'layers');
    const layersQuery = query(layersCollectionRef, orderBy('createdAt'));
    const layersSnap = await getDocs(layersQuery);
    const layerData = layersSnap.docs.map((doc) => ({
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

  // Inside your component, before the return statement
  const groupedLayers = layers.reduce((groups, layer) => {
    const group = layer.groupNumber || 1; // Default to 1 if not set
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(layer);
    return groups;
  }, {});

  // Get sorted group numbers
  const sortedGroupNumbers = Object.keys(groupedLayers)
    .map(Number)
    .sort((a, b) => a - b);

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

      // 3. Optionally: notify parentSessionId or reset UI.
      //    If we have a callback like `onSessionDeleted`, call it.
      //    Or we can call onSessionUpdated with null, or do something else.
      alert(`Session ${sessionId} deleted (including all layers).`);

      // Here, you might do something like navigate away or
      // set selectedSession to null in the parentSessionId. For now:
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
      case 'masterLock':
        return '🔒';
      default:
        return '❓';
    }
  };

  const handleSaveCompletion = async () => {
    try {
      // Update Firestore right now
      const sessionDocRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionDocRef, {
        completionContent: tempCompletionContent,
      });
      // Then store in local state
      setCompletionContent(tempCompletionContent);
      alert('Completion content saved!');
    } catch (err) {
      console.error('Error saving completion content:', err);
    }
    setIsCompletionModalOpen(false);
  };

  return (
    <div style={{ padding: '16px' }}>
      {isLoading ? (
        <p>Loading session...</p>
      ) : sessionData ? (
        <div>
          <div className="session-details-container">
            {/* Left side (on desktop) or top (on mobile) */}
            <div className="session-form">
              <h2>Editing Session: {sessionId}</h2>
              <div style={{ marginBottom: '8px' }}>
                <label>
                  <b>Session Identifier</b>
                </label>
                <input
                  type="text"
                  value={gmName}
                  onChange={(e) => {
                    setGmName(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="For SL identification"
                />
              </div>

              {/* Player-visible name (hacking screen) */}
              <div style={{ marginBottom: '8px' }}>
                <label>
                  <b>Session Title</b>
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => {
                    setPlayerName(e.target.value);
                    setDirty(true);
                  }}
                  placeholder="This will appear on the hacking screen"
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
                />
              </div>

              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', fontWeight: 'bold' }}>Theme</label>
                <select
                  type="select"
                  value={theme}
                  onChange={(e) => {
                    setTheme(e.target.value);
                    setDirty(true);
                  }}
                >
                  <option value="">(No Theme)</option>
                  {THEMES.map((t) => (
                    <option key={t} value={t}>
                      {t} {t == 'Ekanesh' ? 'ಠ_ಠ ?' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', fontWeight: 'bold' }}>Parent Session</label>
                <select
                  type="select"
                  value={parentSessionId || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setParentSessionId(val === '' ? null : val); // empty string => no parent
                    setDirty(true);
                  }}
                >
                  <option value="">No Parent</option>
                  {sessions
                    .filter((s) => s.id !== sessionId) // don't let it be its own parent
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.gmName}
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', fontWeight: 'bold' }}>Status</label>
                <select
                  type="select"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setDirty(true);
                  }}
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
                  <button onClick={handleSaveSession}>Save Session Changes</button>
                ) : (
                  // If not dirty, show the Start button
                  <button
                    style={{
                      backgroundColor: canStart ? 'green' : '#888',
                      color: '#fff',
                      cursor: canStart ? 'pointer' : 'not-allowed',
                    }}
                    disabled={!canStart}
                    onClick={() => {
                      if (canStart) navigate(`/session/${sessionId}`);
                    }}
                  >
                    {canStart ? 'Start' : 'Add at least one layer'}
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
                  flexWrap: 'wrap',
                }}
              >
                <div>
                  <label style={{ display: 'block', fontWeight: 'bold' }}>Puzzle Type</label>
                  <select
                    type="select"
                    value={newLayerPuzzleType}
                    onChange={(e) => setNewLayerPuzzleType(e.target.value)}
                  >
                    {PUZZLE_TYPES.map((pt) => (
                      <option key={pt.value} value={pt.value}>
                        {pt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 'bold' }}>Difficulty</label>
                  <select
                    type="select"
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

                <div>
                  <label style={{ display: 'block', fontWeight: 'bold' }}>Group #</label>
                  <input
                    type="number"
                    value={newLayerGroupNumber}
                    onChange={(e) => setNewLayerGroupNumber(Number(e.target.value))}
                    style={{ width: '100px' }}
                  />
                </div>

                <div style={{ alignSelf: 'flex-end' }}>
                  <button onClick={handleAddLayer}>Add Layer</button>
                </div>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', fontWeight: 'bold' }}>Completion Content</label>
                <button
                  onClick={() => {
                    setTempCompletionContent(completionContent);
                    setIsCompletionModalOpen(true);
                  }}
                >
                  Edit Completion Content
                </button>

                {/* Optionally preview some snippet of content or nothing */}
                {completionContent ? (
                  <p style={{ marginTop: '4px' }}>
                    <em>Content saved. Click &quot;Edit&quot; to modify.</em>
                  </p>
                ) : (
                  <p style={{ fontStyle: 'italic' }}>No content yet.</p>
                )}
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
                <div>
                  {sortedGroupNumbers.map((groupNumber) => (
                    <div key={groupNumber} className="layer-group">
                      {/* Group Header */}
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                        <h4 style={{ marginRight: '16px' }}>Group {groupNumber}</h4>
                      </div>

                      {/* Layers in the Group */}
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '16px',
                        }}
                      >
                        {groupedLayers[groupNumber].map((layer) => {
                          const icon = getPuzzleTypeIcon(layer.puzzleType);
                          const difficultyLabel = DIFFICULTY_LABELS[layer.difficulty] || 'Unknown';

                          return (
                            <div
                              key={layer.id}
                              className="layer-card"
                              style={{ border: '1px solid #ccc', borderRadius: '8px', padding: '8px', width: '200px' }}
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

                              {/* Actions */}
                              <div style={{ marginTop: '8px' }}>
                                {layer.status === 'SOLVED' ? (
                                  <button
                                    onClick={() => handleUpdateLayerStatus(layer.id, 'LOCKED')}
                                    style={{ marginRight: '8px' }}
                                  >
                                    Lock
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleUpdateLayerStatus(layer.id, 'SOLVED')}
                                    style={{ marginRight: '8px' }}
                                  >
                                    Unlock
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
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {isCompletionModalOpen && (
            <div className="modal-overlay">
              <div className="modal-content">
                <h2 className="modal-header">Edit Completion Content</h2>
                <CustomToolbar />
                <ReactQuill
                  theme="snow"
                  modules={quillModules}
                  formats={quillFormats}
                  value={tempCompletionContent}
                  onChange={(html) => setTempCompletionContent(html)}
                  style={{ height: '70vh', marginBottom: '16px' }}
                />
                <div className="modal-actions">
                  <button className="modal-button cancel" onClick={() => setIsCompletionModalOpen(false)}>
                    Cancel
                  </button>
                  <button className="modal-button save" onClick={handleSaveCompletion}>
                    Save
                  </button>
                </div>
              </div>
            </div>
          )}

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
                zIndex: 9999,
              }}
            >
              <div
                style={{
                  backgroundColor: '#343a40',
                  padding: '16px',
                  borderRadius: '8px',
                  maxWidth: '400px',
                  textAlign: 'center',
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
                <button onClick={handleCancelDeleteSession}>Cancel</button>
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
