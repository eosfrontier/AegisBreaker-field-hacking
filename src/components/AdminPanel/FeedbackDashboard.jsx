import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import './AdminPanelLayout.css';
import './FeedbackDashboard.css';

export default function FeedbackDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'raw'
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState('');

  const isAdmin = useMemo(() => {
    try {
      const stored = localStorage.getItem('characterInfo');
      const parsed = stored ? JSON.parse(stored) : null;
      return parsed?.role === 'admin';
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const fetchFeedback = async () => {
      setLoading(true);
      setError('');
      try {
        const snapshot = await getDocs(collection(db, 'feedback'));
        const data = snapshot.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const aTime = a.createdAt?.toMillis?.() ?? new Date(a.clientTs || 0).getTime();
            const bTime = b.createdAt?.toMillis?.() ?? new Date(b.clientTs || 0).getTime();
            return bTime - aTime;
          });
        setRows(data);
      } catch (err) {
        console.error('Failed to load feedback', err);
        setError('Failed to load feedback.');
      } finally {
        setLoading(false);
      }
    };
    fetchFeedback();
  }, []);

  const handleDelete = async (id) => {
    if (!id) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'feedback', id));
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Failed to delete feedback', err);
      setError('Failed to delete row.');
    } finally {
      setDeletingId('');
    }
  };

  if (!isAdmin) {
    return (
      <div className="admin-main feedback-main">
        <div className="feedback-card">
          <p>You need admin access to view feedback.</p>
          <button className="qh-btn" onClick={() => navigate('/')}>
            Back to home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-layout feedback-layout">
      <div className="admin-main">
        <div className="feedback-header-row">
          <div>
            <h2 style={{ margin: 0 }}>Feedback</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--muted, #9fb1c1)' }}>Player ratings and notes.</p>
          </div>
          <button className="qh-btn secondary" onClick={() => navigate('/')} style={{ minWidth: '120px' }}>
            Back
          </button>
        </div>

        <div className="feedback-tabs">
          <button
            className={`feedback-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </button>
          <button className={`feedback-tab ${activeTab === 'raw' ? 'active' : ''}`} onClick={() => setActiveTab('raw')}>
            Raw data
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <div className="feedback-card" style={{ width: '95%' }}>
            <p style={{ margin: 0, color: 'var(--muted, #9fb1c1)' }}>Charts and metrics coming next.</p>
          </div>
        )}

        {activeTab === 'raw' && (
          <div className="feedback-card" style={{ width: '95%' }}>
            {loading && <div>Loading feedback…</div>}
            {error && (
              <div className="feedback-error" style={{ marginBottom: '0.75rem' }}>
                {error}
              </div>
            )}
            {!loading && !rows.length && <div>No feedback yet.</div>}
            {!loading && rows.length > 0 && (
              <div className="feedback-table-wrapper">
                <table className="feedback-table">
                  <thead>
                    <tr>
                      <th></th>
                      <th>Rating</th>
                      <th>Note</th>
                      <th>Session</th>
                      <th>Layer</th>
                      <th>Puzzle</th>
                      <th>Difficulty</th>
                      <th>Faction</th>
                      <th>Name</th>
                      <th>Level</th>
                      <th>Skills</th>
                      <th>Client time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <button
                            className="feedback-delete"
                            onClick={() => handleDelete(row.id)}
                            disabled={deletingId === row.id}
                          >
                            ✕
                          </button>
                        </td>
                        <td>{row.rating ?? '-'}</td>
                        <td className="feedback-note-cell">{row.note || '—'}</td>
                        <td>{row.sessionId || '—'}</td>
                        <td>{row.layerId || '—'}</td>
                        <td>{row.puzzleType || '—'}</td>
                        <td>{row.difficulty ?? '—'}</td>
                        <td>{row.faction || '—'}</td>
                        <td>{row.characterName || '—'}</td>
                        <td>{row.characterLevel ?? '—'}</td>
                        <td>{Array.isArray(row.characterSkills) ? row.characterSkills.join(', ') : '—'}</td>
                        <td>{row.clientTs ? new Date(row.clientTs).toLocaleString() : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
