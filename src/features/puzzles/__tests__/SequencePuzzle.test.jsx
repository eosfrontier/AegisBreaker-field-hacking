import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import SequencePuzzle from '../SequencePuzzle';

const onLocalPuzzleComplete = vi.fn();
const setScriptContext = vi.fn();

vi.mock('../../scripts/ScriptProvider', () => ({
  useScriptContext: () => ({ setScriptContext }),
}));

vi.mock('../../../lib/firebaseConfig', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: () => ({}),
  updateDoc: vi.fn(),
}));

const originalRandom = Math.random;
function stubRandom() {
  let seed = 0.123;
  Math.random = () => {
    seed = (seed + 0.237) % 1;
    return seed;
  };
}

describe('SequencePuzzle', () => {
  beforeEach(() => {
    onLocalPuzzleComplete.mockClear();
    setScriptContext.mockClear();
    stubRandom();
    vi.useFakeTimers();
  });

  afterEach(() => {
    Math.random = originalRandom;
    vi.useRealTimers();
  });

  const renderPuzzle = () =>
    render(<SequencePuzzle layerData={{ difficulty: 1 }} onLocalPuzzleComplete={onLocalPuzzleComplete} />);

  it('can be solved locally by choosing the correct symbols in order', async () => {
    renderPuzzle();

    for (let i = 0; i < 5; i += 1) {
      const targetEl = document.querySelector('.current-target .digital-symbol');
      expect(targetEl).not.toBeNull();
      const targetChar = targetEl.textContent;

      const btn = screen.getAllByRole('button').find((b) => b.textContent === targetChar);
      expect(btn).toBeDefined();

      await act(async () => {
        btn.click();
      });
    }

    expect(onLocalPuzzleComplete).toHaveBeenCalledTimes(1);
  });

  it('exposes script API for hint and narrow band via ScriptProvider', async () => {
    await act(async () => {
      renderPuzzle();
    });

    // Grab the latest script context API provided by the puzzle
    const api = setScriptContext.mock.lastCall?.[0]?.api;
    expect(api).toBeTruthy();

    // Narrow band reduces choices (should be less than default 9)
    await act(async () => {
      api.narrowBand();
    });
    const choiceButtons = screen.getAllByRole('button');
    expect(choiceButtons.length).toBeLessThan(9);

    const targetEl = document.querySelector('.current-target .digital-symbol');
    expect(targetEl).not.toBeNull();
    const targetChar = targetEl.textContent;
    const hintButton = choiceButtons.find((btn) => btn.textContent === targetChar);
    expect(hintButton).toBeDefined();

    // Reveal hint highlights the correct button briefly
    await act(async () => {
      api.revealHint();
    });
    expect(hintButton.style.boxShadow).toContain('0 0 10px');

    // Advance timers to let hint clear without errors
    await act(async () => {
      vi.runAllTimers();
    });
  });
});
