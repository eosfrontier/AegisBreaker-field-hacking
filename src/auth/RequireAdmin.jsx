import { useEffect } from 'react';
import { getAuthMode, getReturnUrl, useJoomlaSession } from './JoomlaSessionContext';

export default function RequireAdmin({ children }) {
  const authMode = getAuthMode();
  const returnUrl = getReturnUrl();
  const { status, isLoggedIn, isAdmin, error } = useJoomlaSession();

  useEffect(() => {
    if (authMode !== 'joomla') return;
    if (status === 'loading' || status === 'idle') return;
    if (!isLoggedIn && returnUrl) {
      window.location.assign(returnUrl);
    }
  }, [authMode, status, isLoggedIn, returnUrl]);

  if (authMode === 'none') {
    return children;
  }

  if (status === 'loading' || status === 'idle') {
    return <div style={{ padding: 16 }}>Checking admin access...</div>;
  }

  if (!isLoggedIn) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Admin login required</h2>
        <p>You must be logged in to access this page.</p>
        {returnUrl ? <p style={{ opacity: 0.8 }}>Redirecting to login...</p> : null}
        {error ? (
          <pre style={{ marginTop: 12, opacity: 0.8 }}>{String(error.message || error)}</pre>
        ) : null}
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Not authorized</h2>
        <p>You are logged in, but your account is not in an admin group.</p>
      </div>
    );
  }

  return children;
}
