import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PuzzleScreen from '../common/PuzzleScreen';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: actual.useNavigate,
    useParams: actual.useParams,
    useSearchParams: actual.useSearchParams,
  };
});

const { sessionSubs, layerSubs, mockUpdateDoc, autoSessionSnapshot, autoLayerSnapshot } = vi.hoisted(() => ({
  sessionSubs: [],
  layerSubs: [],
  mockUpdateDoc: vi.fn(() => Promise.resolve()),
  autoSessionSnapshot: { current: null },
  autoLayerSnapshot: { current: null },
}));

vi.mock('../../scripts/ScriptProvider', () => ({
  useScriptContext: () => ({
    setScriptContext: vi.fn(),
    contextId: null,
    ctxApi: {},
    drawerOpen: false,
    openDrawer: vi.fn(),
    closeDrawer: vi.fn(),
    toggleDrawer: vi.fn(),
  }),
}));

vi.mock('../../../lib/firebaseConfig', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: (dbRef, ...segments) => ({ path: segments }),
  onSnapshot: (ref, cb) => {
    if (ref.path?.length === 2 && ref.path[0] === 'sessions') {
      sessionSubs.push(cb);
      if (autoSessionSnapshot.current) {
        cb({ data: () => autoSessionSnapshot.current });
      }
    } else if (ref.path?.length === 4 && ref.path[0] === 'sessions') {
      layerSubs.push(cb);
      if (autoLayerSnapshot.current) {
        cb({ data: () => autoLayerSnapshot.current });
      }
    }
    return () => {};
  },
  updateDoc: mockUpdateDoc,
}));

vi.mock('../common/PuzzleHost', () => ({
  default: ({ puzzleType, layerData }) => (
    <div data-testid="puzzle-host" data-type={puzzleType} data-status={layerData?.status || 'none'}>
      PuzzleHost
    </div>
  ),
}));

const emitSession = (data) =>
  sessionSubs.forEach((cb) =>
    cb({
      data: () => data,
    }),
  );

const emitLayer = (data) =>
  layerSubs.forEach((cb) =>
    cb({
      data: () => data,
    }),
  );

describe('PuzzleScreen', () => {
  beforeEach(() => {
    sessionSubs.length = 0;
    layerSubs.length = 0;
    mockUpdateDoc.mockClear();
    autoSessionSnapshot.current = null;
    autoLayerSnapshot.current = null;
  });

  afterEach(() => {
    cleanup();
  });

  it('renders local puzzles from query params', () => {
    render(
      <MemoryRouter initialEntries={['/puzzle?type=sequence&difficulty=2']}>
        <Routes>
          <Route path="/puzzle" element={<PuzzleScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    const host = screen.getByTestId('puzzle-host');
    expect(host.dataset.type).toBe('sequence');
    expect(host.dataset.status).toBe('IN_PROGRESS');
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('shows a message when required puzzle params are missing', () => {
    render(
      <MemoryRouter initialEntries={['/puzzle']}>
        <Routes>
          <Route path="/puzzle" element={<PuzzleScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(
      screen.getByText(/Missing puzzle parameters\. Start from Quick Hack or a session link\./i),
    ).toBeInTheDocument();
  });

  it('subscribes to session/layer and unlocks locked layers on load', async () => {
    render(
      <MemoryRouter initialEntries={['/puzzle/session-1/layer-1']}>
        <Routes>
          <Route path="/puzzle/:sessionId/:layerId" element={<PuzzleScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(sessionSubs.length).toBeGreaterThan(0);
      expect(layerSubs.length).toBeGreaterThan(0);
    });

    await act(async () => {
      emitSession({ status: 'ACTIVE' });
      emitLayer({ status: 'LOCKED', puzzleType: 'sequence', difficulty: 1 });
    });

    await waitFor(() =>
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        { path: ['sessions', 'session-1', 'layers', 'layer-1'] },
        { status: 'IN_PROGRESS' },
      ),
    );

    await act(async () => {
      emitLayer({ status: 'IN_PROGRESS', puzzleType: 'sequence', difficulty: 1 });
    });

    expect(await screen.findByTestId('puzzle-host')).toHaveAttribute('data-status', 'IN_PROGRESS');
  });

  it('shows ended message when session is already finished', async () => {
    render(
      <MemoryRouter initialEntries={['/puzzle/session-1/layer-1']}>
        <Routes>
          <Route path="/puzzle/:sessionId/:layerId" element={<PuzzleScreen />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(sessionSubs.length).toBeGreaterThan(0);
      expect(layerSubs.length).toBeGreaterThan(0);
    });

    await act(async () => {
      emitSession({ status: 'SUCCESS' });
      emitLayer({ status: 'IN_PROGRESS', puzzleType: 'sequence', difficulty: 1 });
    });

    expect(await screen.findByText(/The session has ended!/i)).toBeInTheDocument();
  });
});
