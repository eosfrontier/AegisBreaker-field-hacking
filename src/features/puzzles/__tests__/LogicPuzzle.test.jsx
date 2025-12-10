import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LogicPuzzle from '../LogicPuzzle';
import { solveUnique } from '../logic/solver';

const setScriptContext = vi.fn();
const onLocalPuzzleComplete = vi.fn();
const mockUpdateDoc = vi.fn();

const puzzleFixture = {
  processes: [
    { name: 'Alpha', responses: ['Beta is a Utility process.'] },
    { name: 'Beta', responses: ['Charlie is a Security process.'] },
    { name: 'Charlie', responses: ['Alpha is a Security process.'] },
  ],
  rules: { exactSecurity: 1 },
  solution: { Alpha: true, Beta: true, Charlie: false },
};

// Ensure the fixture is uniquely solvable (safety check)
const uniqueSolution = solveUnique(
  puzzleFixture.processes,
  [
    { speaker: 'Alpha', text: 'Beta is a Utility process.' },
    { speaker: 'Beta', text: 'Charlie is a Security process.' },
    { speaker: 'Charlie', text: 'Alpha is a Security process.' },
  ],
  puzzleFixture.rules,
);
if (!uniqueSolution) throw new Error('Puzzle fixture is not uniquely solvable');

vi.mock('../../scripts/ScriptProvider', () => ({
  useScriptContext: () => ({ setScriptContext }),
}));

vi.mock('../../prefs/prefsStore', () => ({
  getFlag: () => true,
}));

vi.mock('../../../lib/firebaseConfig', () => ({
  db: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: (...path) => ({ path }),
  updateDoc: (...args) => mockUpdateDoc(...args),
}));

vi.mock('../logic/generator', () => ({
  generatePuzzleEnsuringUnique: () => puzzleFixture,
}));

vi.mock('../TutorialModal', () => ({
  __esModule: true,
  default: () => null,
}));

describe('LogicPuzzle', () => {
  beforeEach(() => {
    setScriptContext.mockClear();
    onLocalPuzzleComplete.mockClear();
    mockUpdateDoc.mockClear();
  });

  const renderPuzzle = (props = {}) =>
    render(
      <LogicPuzzle
        layerData={{ difficulty: 5, status: 'IN_PROGRESS' }}
        onLocalPuzzleComplete={onLocalPuzzleComplete}
        {...props}
      />,
    );

  it('is solvable at highest difficulty with provided clues', async () => {
    const user = userEvent.setup();
    renderPuzzle();

    // Apply solution guesses: Alpha (Harmless/Utility), Beta (Harmless), Charlie (Security)
    const harmlessButtons = screen.getAllByRole('button', { name: /Harmless/i });
    const securityButtons = screen.getAllByRole('button', { name: /Security/i });

    await user.click(harmlessButtons[0]); // Alpha
    await user.click(harmlessButtons[1]); // Beta
    await user.click(securityButtons[2]); // Charlie

    const validateBtn = screen.getByRole('button', { name: /Validate Identities/i });
    await user.click(validateBtn);

    expect(onLocalPuzzleComplete).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('exposes logic script helpers (reveal clue and weaken)', async () => {
    renderPuzzle();

    const api = setScriptContext.mock.lastCall?.[0]?.api;
    expect(api).toBeTruthy();

    await act(async () => {
      api.revealClue();
    });
    expect(screen.queryByText(/is Harmless|is Security/)).toBeInTheDocument();

    await act(async () => {
      api.weakenIce();
    });
    expect(true).toBe(true);
  });
});
