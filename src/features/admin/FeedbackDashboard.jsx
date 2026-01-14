import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { db } from '../../lib/firebaseConfig';
import { useJoomlaSession } from '../../auth/JoomlaSessionContext';
import './AdminPanelLayout.css';
import './FeedbackDashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function FeedbackDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'raw'
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState('');
  const { isAdmin, status } = useJoomlaSession();

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

  const chartDataByType = useMemo(() => {
    const buckets = new Map();
    rows.forEach((row) => {
      const rating = Number(row.rating);
      if (!Number.isFinite(rating)) return;
      const type = row.puzzleType || 'unknown';
      const difficulty = row.difficulty ?? 'n/a';
      if (!buckets.has(type)) buckets.set(type, {});
      const diffBucket = buckets.get(type);
      if (!diffBucket[difficulty]) diffBucket[difficulty] = [];
      diffBucket[difficulty].push(rating);
    });

    return Array.from(buckets.entries()).map(([type, diffMap]) => {
      const baseDiffs = ['1', '2', '3', '4', '5'];
      const averages = {};
      Object.entries(diffMap).forEach(([diff, ratings]) => {
        const sum = ratings.reduce((acc, r) => acc + r, 0);
        averages[String(diff)] = +(sum / ratings.length).toFixed(2);
      });

      // Keep 1-5 in order, append any other diff keys afterward
      const extraDiffs = Object.keys(averages)
        .filter((d) => !baseDiffs.includes(d))
        .sort();
      const labels = [...baseDiffs, ...extraDiffs];
      const data = labels.map((label) => (label in averages ? averages[label] : null));

      return { type, labels, data };
    });
  }, [rows]);

  const notedRows = useMemo(
    () =>
      rows
        .map((row) => ({
          ...row,
          note: typeof row.note === 'string' ? row.note.trim() : '',
          ts: row.createdAt?.toMillis?.() ?? (row.clientTs ? new Date(row.clientTs).getTime() : 0),
        }))
        .filter((row) => row.note),
    [rows],
  );

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

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="admin-main feedback-main">
        <div className="feedback-card">
          <p>Checking admin access...</p>
        </div>
      </div>
    );
  }

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
          <>
            <div className="feedback-card">
              {!loading && chartDataByType.length === 0 && <div>No ratings yet to chart.</div>}
              {loading && <div>Loading feedback...</div>}
              {!loading &&
                chartDataByType.map((chart) => (
                  <div key={chart.type} className="feedback-chart">
                    <h4 className="feedback-chart-title">{chart.type}</h4>
                    <Bar
                      data={{
                        labels: chart.labels,
                        datasets: [
                          {
                            label: 'Avg rating',
                            data: chart.data,
                            backgroundColor: 'rgba(103, 232, 249, 0.35)',
                            borderColor: 'rgba(103, 232, 249, 0.9)',
                            borderWidth: 1,
                          },
                        ],
                      }}
                      options={{
                        responsive: true,
                        plugins: {
                          legend: { display: false },
                          tooltip: { mode: 'index', intersect: false },
                          title: { display: false },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            suggestedMax: 5,
                            ticks: { stepSize: 1 },
                          },
                          x: {
                            grid: { display: false },
                          },
                        },
                      }}
                    />
                  </div>
                ))}
            </div>
            {!loading && notedRows.length > 0 && (
              <div className="feedback-card feedback-notes-card">
                <h4 className="feedback-chart-title">Notes</h4>
                <ul className="feedback-notes-list">
                  {notedRows.map((row) => (
                    <li key={row.id}>
                      <div className="feedback-note-meta">
                        <span>{row.characterName || 'Anon'}</span>
                        <span className="dot">·</span>
                        <span>{row.puzzleType || 'Unknown'}</span>
                        {row.difficulty ? (
                          <>
                            <span className="dot">·</span>
                            <span>Diff {row.difficulty}</span>
                          </>
                        ) : null}
                      </div>
                      <div className="feedback-note-text">{row.note}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}

        {activeTab === 'raw' && (
          <div className="feedback-card" style={{ width: '95%' }}>
            {loading && <div>Loading feedback...</div>}
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
                            X
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
