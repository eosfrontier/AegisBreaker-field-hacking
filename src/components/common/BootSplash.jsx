import { useEffect, useRef, useState } from 'react';

import './BootSplash.css';

const DEFAULT_STEPS = [
  { label: 'Bootloader…', ms: 400 },
  { label: 'Calibrating sensors…', ms: 500 },
  { label: 'Requesting uplink…', ms: 650 },
  { label: 'Handshake ACK…', ms: 450 },
  { label: 'Decrypting session…', ms: 700 },
  { label: 'AegisBreaker online.', ms: 400 },
];

const CODE_LEXICON = [
  'PING gate://relay-7',
  'ACK <200>',
  'AUTH NTLM v2',
  'ICE pattern: BARRICADE',
  'TOKEN exch @keystore',
  'PBKDF2…',
  'HKDF(salt)…',
  'ECDH prime256v1',
  'MUX /dev/ttyS0',
  'SCAN rf[13.56mhz]',
  'PORT 443/tls1.3',
  'CSP inline-nonce ok',
  'COSIGN: lvl-3',
  'PROC fork()',
  'SIGMA-I roundtrip',
  'IV ok',
  'CRC32 pass',
  'RETRY window 2',
  'JITTER 18ms',
  'ECHO suppress',
  'CHALLENGE…',
  'REPLY √',
];

const genLine = () =>
  `${new Date().toISOString().split('T')[1].slice(0, 8)}  ${
    CODE_LEXICON[Math.floor(Math.random() * CODE_LEXICON.length)]
  }`;

function useReducedMotion() {
  const [pref, setPref] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPref(mq.matches);
    const h = (e) => setPref(e.matches);
    mq.addEventListener?.('change', h);
    return () => mq.removeEventListener?.('change', h);
  }, []);
  return pref;
}

/**
 * BootSplash
 * Props:
 * - show: boolean (controls visibility)
 * - onDone: () => void (called after fade out or skip)
 * - steps?: array<{label, ms}> (default steps shown above the progress bar)
 * - persistKey?: string (if set, writes to localStorage on complete)
 * - title?: string (default "AEGISBREAKER")
 * - allowSkip?: boolean (default true)
 * - minMs?: number (minimum total duration; default auto-sum of steps)
 */
export default function BootSplash({
  show,
  onDone,
  steps = DEFAULT_STEPS,
  persistKey,
  title = 'AEGISBREAKER',
  allowSkip = true,
  minMs,
}) {
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState(0); // 0..100
  const [status, setStatus] = useState(steps?.[0]?.label || '');
  const [phase, setPhase] = useState('in'); // in -> running -> out
  const [lines, setLines] = useState(() => Array.from({ length: 14 }, genLine));
  const bodyOverflowRef = useRef('');

  // lock background scroll while visible
  useEffect(() => {
    if (!show) return;
    bodyOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = bodyOverflowRef.current || '';
    };
  }, [show]);

  // main runner
  useEffect(() => {
    if (!show) return;

    let mounted = true;
    setPhase('in');
    setProgress(0);
    setStatus(steps?.[0]?.label || '');
    setLines(Array.from({ length: reduced ? 6 : 14 }, genLine));

    const total = minMs ?? steps.reduce((acc, s) => acc + (s.ms || 400), 0);
    const start = performance.now();

    // add “code” lines quickly
    const codeTickMs = reduced ? 140 : 45;
    const codeTimer = setInterval(() => {
      setLines((prev) => {
        const next = prev.slice(-(reduced ? 12 : 24));
        next.push(genLine());
        return next;
      });
    }, codeTickMs);

    // advance status by step schedule
    let stepIndex = 0;
    let stepElapsed = 0;
    const stepDurations = steps.map((s) => s.ms || 400);

    const raf = () => {
      if (!mounted) return;
      const now = performance.now();
      const elapsed = now - start;
      const p = Math.min(100, Math.floor((elapsed / total) * 100));
      setProgress(p);

      // update status based on cumulative elapsed
      while (stepIndex < stepDurations.length && stepElapsed + stepDurations[stepIndex] <= elapsed) {
        stepElapsed += stepDurations[stepIndex];
        stepIndex++;
        if (stepIndex < steps.length) setStatus(steps[stepIndex].label);
      }

      if (elapsed >= total) {
        clearInterval(codeTimer);
        setPhase('out');
        // slight fade-out delay
        setTimeout(
          () => {
            if (persistKey) {
              try {
                localStorage.setItem(persistKey, '1');
              } catch {
                // ignore
              }
            }
            onDone?.();
          },
          reduced ? 80 : 320,
        );
        return;
      }
      requestAnimationFrame(raf);
    };
    requestAnimationFrame(raf);

    return () => {
      mounted = false;
      clearInterval(codeTimer);
    };
  }, [show, steps, minMs, persistKey, onDone, reduced]);

  // keyboard: ESC to skip
  useEffect(() => {
    if (!show || !allowSkip) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setProgress(100);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [show, allowSkip]);

  if (!show) return null;

  return (
    <div
      className={`ab-splash-overlay ${phase === 'out' ? 'ab-fade-out' : 'ab-fade-in'}`}
      role="dialog"
      aria-modal="true"
      aria-label="Establishing secure link"
      onClick={() => allowSkip && setProgress(100)}
    >
      <div className="ab-splash-frame" onClick={(e) => e.stopPropagation()}>
        <div className="ab-splash-title">
          <span className="ab-title">{title}</span>
          <span className="ab-subtitle">Establishing secure uplink…</span>
        </div>

        <div className="ab-splash-code qh-card">
          <pre aria-hidden="true">
            {lines.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </pre>
        </div>

        <div className="ab-splash-status">
          <span className="ab-status-text">{status}</span>
          <div className="ab-progress qh-card">
            <div className="ab-progress-bar" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* {allowSkip && (
          <button className="qh-btn secondary ab-skip" onClick={() => setProgress(100)}>
            Skip
          </button>
        )} */}
      </div>
    </div>
  );
}
