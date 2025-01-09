import { useState, useEffect } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import SessionList from './SessionList';
import SessionEditor from './SessionEditor';
import './AdminPanelLayout.css';

function AdminPanelLayout() {
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // for mobile

  useEffect(() => {
    const fetchSessions = async () => {
      const sessionsRef = collection(db, 'sessions');
      const snapshot = await getDocs(sessionsRef);
      const sessionData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSessions(sessionData);
    };
    fetchSessions();
  }, []);

  const handleSelectSession = (sessionId) => {
    setSelectedSessionId(sessionId);
    // On mobile, close the sidebar once a session is selected
    setIsSidebarOpen(false);
  };

  const createNewSession = async () => {
    const docRef = await addDoc(collection(db, 'sessions'), {
      name: 'New Session',
      status: 'ACTIVE',
      timeLimit: 300,
      createdAt: new Date().toISOString(),
    });
    const newSession = {
      id: docRef.id,
      name: 'New Session',
      status: 'ACTIVE',
      timeLimit: 300,
      createdAt: new Date().toISOString(),
    };
    setSessions((prev) => [...prev, newSession]);
    setSelectedSessionId(docRef.id);
    // Close sidebar on mobile
    setIsSidebarOpen(false);
  };

  // Update the local sessions array if something changed in the editor
  const handleSessionUpdated = (updatedSession) => {
    if (updatedSession.deleted) {
      // session was deleted
      setSessions((prev) => prev.filter(s => s.id !== updatedSession.id));
      setSelectedSessionId(null); // or force to select another session
      return;
    }
    // normal update logic
    setSessions((prev) =>
      prev.map((s) => (s.id === updatedSession.id ? updatedSession : s))
    );
  };

  

  return (
    <div className="admin-layout">
      {/* Hamburger button (only visible on mobile via CSS) */}
      <button
        className="hamburger-btn"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        ☰
      </button>

      {/* Sidebar (Session List) */}
      <div className={`admin-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <SessionList
          sessions={sessions}
          selectedSessionId={selectedSessionId}
          onSelectSession={handleSelectSession}
          onCreateNewSession={createNewSession}
        />
      </div>

      {/* Main content (Session Editor) */}
      <div className="admin-main">
        {selectedSessionId ? (
          <SessionEditor
            sessionId={selectedSessionId}
            onSessionUpdated={handleSessionUpdated}
          />
        ) : (
          <div className="no-session">
            <h2>Please select or create a session.</h2>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminPanelLayout;
