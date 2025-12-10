import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import MainHackingScreen from './MainHackingScreen';
import { ScriptProvider } from '../scripts/ScriptProvider';

const { sessionSubs, layerSubs, childSubs, mockUpdateDoc, mockGetDoc, fakeTimestamp } = vi.hoisted(() => ({
  sessionSubs: [],
  layerSubs: [],
  childSubs: [],
  mockUpdateDoc: vi.fn(() => Promise.resolve()),
  mockGetDoc: vi.fn(() => Promise.resolve({ exists: () => false })),
  fakeTimestamp: { fromMillis: (ms) => ({ toMillis: () => ms }) },
}));

vi.mock('../../lib/firebaseConfig', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: (dbRef, ...segments) => ({ path: segments }),
  collection: (dbRef, ...segments) => ({ path: segments }),
  query: (...args) => args,
  where: () => ({}),
  onSnapshot: (ref, cb) => {
    if (ref.path?.[0] === 'sessions' && ref.path.length === 2) {
      sessionSubs.push(cb);
    } else if (ref.path?.[0] === 'sessions' && ref.path[2] === 'layers') {
      layerSubs.push(cb);
    } else if (Array.isArray(ref) && ref[0]?.path?.[0] === 'sessions') {
      childSubs.push(cb);
    }
    return () => {};
  },
  updateDoc: mockUpdateDoc,
  getDoc: mockGetDoc,
  Timestamp: fakeTimestamp,
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useParams: () => ({ sessionId: 'session-1' }),
    useNavigate: () => vi.fn(),
  };
});

const emitSession = (data) =>
  sessionSubs.forEach((cb) =>
    cb({
      id: 'session-1',
      exists: () => true,
      data: () => data,
    }),
  );

const emitLayers = (layers) =>
  layerSubs.forEach((cb) =>
    cb({
      forEach: (fn) =>
        layers.forEach((layer) =>
          fn({
            id: layer.id,
            data: () => layer,
          }),
        ),
    }),
  );

const emitChildren = (children) =>
  childSubs.forEach((cb) =>
    cb({
      forEach: (fn) =>
        children.forEach((child) =>
          fn({
            id: child.id,
            data: () => child,
          }),
        ),
    }),
  );

const renderScreen = (initialEntry = '/session/session-1') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ScriptProvider>
        <Routes>
          <Route path="/session/:sessionId" element={<MainHackingScreen />} />
          <Route path="/session/:sessionId/start" element={<MainHackingScreen />} />
        </Routes>
      </ScriptProvider>
    </MemoryRouter>,
  );

describe('MainHackingScreen', () => {
  beforeEach(() => {
    sessionSubs.length = 0;
    layerSubs.length = 0;
    childSubs.length = 0;
    mockUpdateDoc.mockClear();
    mockGetDoc.mockReset();
    mockGetDoc.mockResolvedValue({ exists: () => false });
    localStorage.clear();

    // jsdom stubs for DOM APIs used in component effects
    Element.prototype.scrollIntoView = vi.fn();
    if (!HTMLCanvasElement.prototype.getContext) {
      HTMLCanvasElement.prototype.getContext = vi.fn();
    }
  });

  afterEach(() => {
    cleanup();
  });

  it('shows completion content after last puzzle solved triggers SUCCESS', async () => {
    renderScreen();

    await waitFor(() => {
      expect(sessionSubs.length).toBeGreaterThan(0);
      expect(layerSubs.length).toBeGreaterThan(0);
    });

    await act(async () => {
      emitSession({
        status: 'ACTIVE',
        playerName: 'Hacker',
        completionContent: '<p>Mission complete</p>',
        timeLimit: 100,
        endTime: fakeTimestamp.fromMillis(Date.now() + 60000),
      });

      emitLayers([
        { id: 'l1', groupNumber: 1, status: 'SOLVED' },
        { id: 'l2', groupNumber: 1, status: 'SOLVED' },
      ]);
    });

    await waitFor(() =>
      expect(mockUpdateDoc).toHaveBeenCalledWith({ path: ['sessions', 'session-1'] }, { status: 'SUCCESS' }),
    );

    await act(async () => {
      emitSession({
        status: 'SUCCESS',
        playerName: 'Hacker',
        completionContent: '<p>Mission complete</p>',
      });
    });

    expect(await screen.findByText('Mission complete')).toBeVisible();
  });

  it('marks failure when time runs out and layers remain unsolved', async () => {
    renderScreen();

    await waitFor(() => {
      expect(sessionSubs.length).toBeGreaterThan(0);
      expect(layerSubs.length).toBeGreaterThan(0);
    });

    await act(async () => {
      emitSession({
        status: 'ACTIVE',
        playerName: 'Hacker',
        completionContent: '<p>Mission complete</p>',
        timeLimit: 100,
        endTime: fakeTimestamp.fromMillis(Date.now() - 1000),
      });

      emitLayers([{ id: 'l1', groupNumber: 1, status: 'PENDING' }]);
    });

    await waitFor(() =>
      expect(mockUpdateDoc).toHaveBeenCalledWith({ path: ['sessions', 'session-1'] }, { status: 'FAILURE' }),
    );

    await act(async () => {
      emitSession({
        status: 'FAILURE',
        playerName: 'Hacker',
        completionContent: '<p>Mission complete</p>',
      });
    });

    expect(await screen.findByText('Hack Failed!')).toBeVisible();
  });

  it('locks the session when parent session is not successful', async () => {
    mockGetDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ status: 'ACTIVE', playerName: 'Parent Player' }),
      id: 'parent-1',
    });

    renderScreen();

    await waitFor(() => expect(sessionSubs.length).toBeGreaterThan(0));

    await act(async () => {
      emitSession({
        status: 'INIT',
        playerName: 'Hacker',
        parentSessionId: 'parent-1',
      });
    });

    expect(await screen.findByText('Session Locked')).toBeVisible();
    expect(screen.getByRole('button', { name: /Go to Parent: Parent Player/i })).toBeVisible();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('shows child session buttons when current session succeeds', async () => {
    renderScreen();

    await waitFor(() => {
      expect(sessionSubs.length).toBeGreaterThan(0);
      expect(childSubs.length).toBeGreaterThan(0);
    });

    await act(async () => {
      emitSession({
        status: 'SUCCESS',
        playerName: 'Hacker',
        completionContent: '<p>Mission complete</p>',
      });
    });

    await act(async () => {
      emitChildren([
        { id: 'child-1', playerName: 'Child One' },
        { id: 'child-2', playerName: 'Child Two' },
      ]);
    });

    expect(await screen.findByRole('button', { name: 'Child One' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Child Two' })).toBeVisible();
  });

  it('auto-opens start modal on /start route and shows eligibility issues when no profile', async () => {
    renderScreen('/session/session-1/start');

    await waitFor(() => expect(sessionSubs.length).toBeGreaterThan(0));

    await act(async () => {
      emitSession({
        status: 'INIT',
        playerName: 'Hacker',
        timeLimit: 60,
      });
    });

    expect(await screen.findByText('Start Hack')).toBeVisible();
    expect(screen.getByText(/Profile required/i)).toBeVisible();
  });

  it('allows starting via modal when profile meets requirements and triggers initialize', async () => {
    localStorage.setItem(
      'characterInfo',
      JSON.stringify({
        role: 'operative',
        name: 'Player',
        faction: 'dugo',
        level: 3,
        skills: ['initialize', 'hack_consumer'],
      }),
    );

    renderScreen('/session/session-1/start');

    await waitFor(() => expect(sessionSubs.length).toBeGreaterThan(0));

    await act(async () => {
      emitSession({
        status: 'INIT',
        playerName: 'Hacker',
        timeLimit: 60,
        requiredDeviceSkill: 'hack_consumer',
      });
    });

    // Modal should be open
    expect(await screen.findByText('Ready to initialize this hack?')).toBeVisible();

    await act(async () => {
      screen.getByRole('button', { name: /Confirm & Start/i }).click();
    });

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      { path: ['sessions', 'session-1'] },
      expect.objectContaining({ status: 'ACTIVE', endTime: expect.any(Object) }),
    );
  });
});
