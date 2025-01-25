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
      status: 'INIT',
      timeLimit: 300,
      createdAt: new Date().toISOString(),
    });
    const newSession = {
      id: docRef.id,
      name: 'New Session',
      status: 'INIT',
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
      setSelectedSessionId(null);
      return;
    }
    // normal update logic
    setSessions((prev) =>
      prev.map((s) => (s.id === updatedSession.id ? updatedSession : s))
    );
  };

        {/* <!--<svg viewBox="0 0 100 169.5">
	<polygon points="50,34.75 93.5,59.75 93.5,109.75 50,134.75 6.5,109.75 6.5,59.75"></polygon>
	<polygon points="0,-50 43.5,-25 43.5,25 0,50 -43.5,25 -43.5,-25"></polygon>
	<polygon points="100,-50 143.5,-25 143.5,25 100,50 56.5,25 56.5,-25"></polygon>
	<polygon points="0,119.5 43.5,144.5 43.5,194.5 0,219.5 -43.5,194.5 -43.5,144.5"></polygon>
	<polygon points="100,119.5 143.5,144.5 143.5,194.5 100,219.5 56.5,194.5 56.5,144.5"></polygon>
</svg>--> */}

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
            sessions={sessions}
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
