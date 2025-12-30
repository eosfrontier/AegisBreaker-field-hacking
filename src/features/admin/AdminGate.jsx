import { useEffect, useMemo, useState } from "react";

const ADMIN_GROUPS = (import.meta.env.VITE_JOOMLA_ADMIN_GROUPS || "30,36,8,31")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export default function JoomlaAdminGate({ children }) {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [error, setError] = useState(null);

  const adminSet = useMemo(() => new Set(ADMIN_GROUPS), []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);

        const mockRaw = import.meta.env.VITE_JOOMLA_MOCK_USER;

        // Debug once (you can remove later)
        console.log("[JoomlaAdminGate] DEV:", import.meta.env.DEV, "mock present:", !!mockRaw);

        let data;

        if (import.meta.env.DEV && mockRaw) {
          data = JSON.parse(mockRaw);
        } else {
          const res = await fetch("/assets/idandgroups.php", {
            credentials: "include",
            cache: "no-store",
          });

          // Better error message when you accidentally get HTML/PHP
          const text = await res.text();
          try {
            data = JSON.parse(text);
          } catch {
            throw new Error(`Expected JSON from /assets/idandgroups.php but got: ${text.slice(0, 80)}`);
          }
        }

        if (!cancelled) {
          setUserData(data);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) {
          setUserData(null);
          setError(e);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <div style={{ padding: 16 }}>Checking Joomla session…</div>;

  const id = String(userData?.id ?? "");
  const groups = Array.isArray(userData?.groups) ? userData.groups.map(String) : [];

  // Not logged in (Joomla usually uses id 0 for guests)
  const isGuest = !id || id === "0";

  if (!userData || isGuest) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Admin login required</h2>
        <p>You must be logged in on eosfrontier.space to access the admin panel.</p>
        <p style={{ opacity: 0.8 }}>
          After logging in, refresh this page. If it still fails, the endpoint may not be
          available on this domain yet.
        </p>
        <div style={{ marginTop: 12 }}>
          <a href="https://eosfrontier.space/" target="_blank" rel="noreferrer">
            Open eosfrontier.space
          </a>
        </div>
        {error ? (
          <pre style={{ marginTop: 12, opacity: 0.8 }}>
            {String(error.message || error)}
          </pre>
        ) : null}
      </div>
    );
  }

  const isAdmin = groups.some((g) => adminSet.has(g));

  if (!isAdmin) {
    return (
      <div style={{ padding: 16 }}>
        <h2>Not authorized</h2>
        <p>
          Logged in as Joomla user <b>{id}</b>, but your account is not in an allowed admin group.
        </p>
        <p style={{ opacity: 0.8 }}>
          Your groups: {groups.join(", ") || "(none)"} <br />
          Allowed admin groups: {ADMIN_GROUPS.join(", ")}
        </p>
      </div>
    );
  }

  return children;
}
