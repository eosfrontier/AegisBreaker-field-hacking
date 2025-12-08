function SessionList({ sessions, selectedSessionId, onSelectSession, onCreateNewSession }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h2 style={{ margin: '16px 0', textAlign: 'center' }}>Sessions</h2>
      <ul style={{ flex: 1, overflowY: 'auto', margin: '0 16px', padding: 0 }}>
        {sessions.map((session) => (
          <li
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            style={{
              listStyle: 'none',
              padding: '8px',
              marginBottom: '4px',
              cursor: 'pointer',
              backgroundColor: session.id === selectedSessionId ? '#999' : '#444',
              borderRadius: '4px',
            }}
          >
            {session.gmName || session.name || 'Unnamed Session'}
          </li>
        ))}
      </ul>

      <div style={{ padding: '16px' }}>
        <button onClick={onCreateNewSession} style={{ width: '100%' }}>
          Create New Session
        </button>
      </div>
    </div>
  );
}

export default SessionList;
