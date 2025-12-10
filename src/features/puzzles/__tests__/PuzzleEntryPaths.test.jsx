import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import HexGrid from '../../hacking-session/HexGrid';
import QuickHackScreen from '../../unplanned-puzzle/QuickHackScreen';
import QrScannerPage from '../../scanner/QrScannerPage';

const navigateMock = vi.fn();
const scanHandlers = [];

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
    useSearchParams: actual.useSearchParams,
  };
});

vi.mock('@yudiel/react-qr-scanner', () => ({
  Scanner: (props) => {
    scanHandlers.push(props.onScan);
    return <div data-testid="scanner-mock" />;
  },
}));

vi.mock('qrcode.react', () => ({
  QRCodeCanvas: ({ value }) => <div data-testid="qr-code" data-value={value} />,
}));

describe('Puzzle entry paths', () => {
  beforeEach(() => {
    navigateMock.mockClear();
    scanHandlers.length = 0;
  });

  it('encodes session puzzle links into QR codes on the session grid', () => {
    render(
      <HexGrid
        sessionId="session-123"
        variant="active"
        layers={[{ id: 'layer-1', status: 'IN_PROGRESS', difficulty: 2, puzzleType: 'sequence' }]}
      />,
    );

    const qr = screen.getByTestId('qr-code');
    expect(qr.dataset.value).toBe(`${window.location.origin}/puzzle/session-123/layer-1`);
  });

  it('navigates to the puzzle route from QuickHack menu selection', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/quickhack']}>
        <QuickHackScreen />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole('button', { name: /Sequencer/i }));
    await user.click(screen.getByRole('button', { name: /^Next$/i }));
    await user.click(screen.getByRole('button', { name: /Basic/i }));
    await user.click(screen.getByRole('button', { name: /Engage/i }));

    expect(navigateMock).toHaveBeenCalledWith('/puzzle?type=sequence&difficulty=1');
  });

  it('navigates to scanned puzzle links in the QR scanner', async () => {
    render(
      <MemoryRouter>
        <QrScannerPage />
      </MemoryRouter>,
    );

    await waitFor(() => expect(scanHandlers.length).toBeGreaterThan(0));

    // Simulate a scan that points to a puzzle URL on the same origin
    const puzzleUrl = `${window.location.origin}/puzzle/session-9/layer-3`;
    scanHandlers[0]([{ rawValue: puzzleUrl }]);

    expect(navigateMock).toHaveBeenCalledWith('/puzzle/session-9/layer-3');
  });
});
