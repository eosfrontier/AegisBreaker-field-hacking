import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import FrequencyPuzzle from '../FrequencyPuzzle';

const { setScriptContext, onLocalPuzzleComplete, mockUpdateDoc, originalRandom, stubRandom } = vi.hoisted(() => ({
  setScriptContext: vi.fn(),
  onLocalPuzzleComplete: vi.fn(),
  mockUpdateDoc: vi.fn(() => Promise.resolve()),
  originalRandom: Math.random,
  stubRandom: () => {
    let seed = 0.123;
    Math.random = () => {
      seed = (seed + 0.237) % 1;
      return seed;
    };
  },
}));

vi.mock('../../scripts/ScriptProvider', () => ({
  useScriptContext: () => ({ setScriptContext }),
}));

vi.mock('../../../lib/firebaseConfig', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: (...path) => ({ path }),
  updateDoc: (...args) => mockUpdateDoc(...args),
}));

vi.mock('chart.js', () => ({
  Chart: { register: vi.fn() },
  CategoryScale: {},
  LinearScale: {},
  PointElement: {},
  LineElement: {},
  Title: {},
  Tooltip: {},
  Legend: {},
}));

vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid="chart" />,
}));

describe('FrequencyPuzzle', () => {
  beforeEach(() => {
    setScriptContext.mockClear();
    onLocalPuzzleComplete.mockClear();
    mockUpdateDoc.mockClear();
    stubRandom();
  });

  afterEach(() => {
    Math.random = originalRandom;
  });

  const renderLocal = () =>
    render(<FrequencyPuzzle layerData={{ difficulty: 1, status: 'IN_PROGRESS' }} onLocalPuzzleComplete={onLocalPuzzleComplete} />);

  const renderSession = () =>
    render(
      <FrequencyPuzzle
        sessionId="s1"
        layerId="l1"
        layerData={{ difficulty: 2, status: 'IN_PROGRESS' }}
        onLocalPuzzleComplete={onLocalPuzzleComplete}
      />,
    );

  it('exposes frequency script APIs and autoLock solves local puzzle', async () => {
    await act(async () => {
      renderLocal();
    });

    const api = setScriptContext.mock.lastCall?.[0]?.api;
    expect(api).toBeTruthy();

    await act(async () => {
      api.autoLock();
    });

    await waitFor(() => expect(onLocalPuzzleComplete).toHaveBeenCalledTimes(1));
  });

  it('autoLock marks session puzzles as solved via Firestore', async () => {
    await act(async () => {
      renderSession();
    });

    const api = setScriptContext.mock.lastCall?.[0]?.api;
    expect(api).toBeTruthy();

    await act(async () => {
      api.autoLock();
    });

    await waitFor(() => {
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      const [ref, payload] = mockUpdateDoc.mock.calls[0];
      expect(ref.path.slice(1)).toEqual(['sessions', 's1', 'layers', 'l1']);
      expect(payload).toEqual({ status: 'SOLVED' });
    });
  });
});
