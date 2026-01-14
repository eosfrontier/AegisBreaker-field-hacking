import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const JoomlaSessionContext = createContext(null);

const DEFAULT_ADMIN_GROUPS = '30,36,8,31';
const JOOMLA_RETURN_PATH = '/return-to-aegis-breaker';
const JOOMLA_RETURN_ORIGIN = 'https://www.eosfrontier.space';

const normalizeAuthMode = (mode) => {
  const normalized = String(mode || 'joomla').toLowerCase();
  return normalized === 'none' || normalized === 'mock' || normalized === 'joomla' ? normalized : 'joomla';
};

export const getAuthMode = () => normalizeAuthMode(import.meta.env.VITE_AUTH_MODE);

export const getAdminGroups = () => {
  const raw = String(import.meta.env.VITE_JOOMLA_ADMIN_GROUPS || DEFAULT_ADMIN_GROUPS);
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

export const getReturnUrl = () => {
  const fallback = `${JOOMLA_RETURN_ORIGIN}${JOOMLA_RETURN_PATH}`;
  if (typeof window === 'undefined' || !window.location?.origin) {
    return fallback;
  }
  const authMode = getAuthMode();
  if (authMode === 'joomla') {
    return fallback;
  }
  return `${window.location.origin}${JOOMLA_RETURN_PATH}`;
};

const normalizeUser = (data) => {
  if (!data || typeof data !== 'object') {
    return { id: '', groups: [] };
  }
  const id = data.id != null ? String(data.id) : '';
  const groups = Array.isArray(data.groups) ? data.groups.map((g) => String(g)) : [];
  return { id, groups };
};

const parseMockUser = () => {
  const raw = import.meta.env.VITE_JOOMLA_MOCK_USER;
  if (!raw) throw new Error('VITE_AUTH_MODE=mock but VITE_JOOMLA_MOCK_USER is missing');
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('VITE_JOOMLA_MOCK_USER must be valid JSON');
  }
  return normalizeUser(parsed);
};

export function JoomlaSessionProvider({ children }) {
  const [status, setStatus] = useState('idle');
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const requestIdRef = useRef(0);
  const activeRef = useRef(true);

  const resolveSession = useCallback(async () => {
    const authMode = getAuthMode();
    const requestId = ++requestIdRef.current;

    setStatus('loading');
    setError(null);

    const finalize = (nextUser, nextError) => {
      if (!activeRef.current || requestId !== requestIdRef.current) return;
      setUser(nextUser);
      setError(nextError || null);
      setStatus(nextError ? 'error' : 'ready');
    };

    try {
      if (authMode === 'none') {
        finalize(normalizeUser({ id: '0', groups: getAdminGroups() }), null);
        return;
      }

      if (authMode === 'mock') {
        // Firebase Hosting cannot execute PHP, so mock mode avoids /assets/idandgroups.php there.
        finalize(normalizeUser({ id: '0', groups: [] }), null);
        return;
      }

      const res = await fetch('/assets/idandgroups.php', {
        credentials: 'include',
        cache: 'no-store',
      });
      const text = await res.text();
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error(`Expected JSON from /assets/idandgroups.php but got: ${text.slice(0, 80)}`);
      }
      if (!res.ok) {
        throw new Error(`Joomla session request failed (${res.status}): ${text.slice(0, 80)}`);
      }
      finalize(normalizeUser(parsed), null);
    } catch (err) {
      finalize(null, err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  const grantMockAdmin = useCallback(() => {
    if (getAuthMode() !== 'mock') return;
    requestIdRef.current += 1;
    try {
      const mockUser = parseMockUser();
      setUser(mockUser);
      setError(null);
      setStatus('ready');
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    activeRef.current = true;
    resolveSession();
    return () => {
      activeRef.current = false;
    };
  }, [resolveSession]);

  const authMode = getAuthMode();
  const adminGroups = useMemo(() => getAdminGroups(), []);
  const adminSet = useMemo(() => new Set(adminGroups), [adminGroups]);
  const joomlaId = user?.id != null ? String(user.id) : '';
  const groups = useMemo(
    () => (Array.isArray(user?.groups) ? user.groups.map((g) => String(g)) : []),
    [user?.groups],
  );
  const isLoggedIn = authMode === 'none' ? true : Boolean(joomlaId && joomlaId !== '0');
  const isAdmin = authMode === 'none' ? true : groups.some((g) => adminSet.has(g));

  const value = useMemo(
    () => ({
      status,
      user,
      isLoggedIn,
      isAdmin,
      groups,
      joomlaId,
      refresh: resolveSession,
      grantMockAdmin,
      error,
    }),
    [status, user, isLoggedIn, isAdmin, groups, joomlaId, resolveSession, grantMockAdmin, error],
  );

  return <JoomlaSessionContext.Provider value={value}>{children}</JoomlaSessionContext.Provider>;
}

export function useJoomlaSession() {
  const ctx = useContext(JoomlaSessionContext);
  if (!ctx) {
    throw new Error('useJoomlaSession must be used within JoomlaSessionProvider');
  }
  return ctx;
}
