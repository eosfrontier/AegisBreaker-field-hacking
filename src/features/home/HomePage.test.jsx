import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act, waitForElementToBeRemoved } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { JoomlaSessionProvider } from '../../auth/JoomlaSessionContext';
import HomePage from './HomePage';

vi.mock('react-icons/ai', () => ({
  AiOutlineUser: () => <span data-testid="icon-setting" />,
}));

describe('HomePage profile modal flow', () => {
  let previousAuthMode;

  beforeEach(() => {
    previousAuthMode = import.meta.env.VITE_AUTH_MODE;
    try {
      import.meta.env.VITE_AUTH_MODE = 'mock';
    } catch {
      // ignore if the test runner locks env writes
    }
    localStorage.clear();
    localStorage.setItem('ab:once:boot', '1'); // skip BootSplash overlay
  });

  afterEach(() => {
    try {
      import.meta.env.VITE_AUTH_MODE = previousAuthMode;
    } catch {
      /* ignore */
    }
    vi.clearAllMocks();
  });

  const renderHome = () =>
    render(
      <MemoryRouter>
        <JoomlaSessionProvider>
          <HomePage />
        </JoomlaSessionProvider>
      </MemoryRouter>,
    );

  const ensureModalOpen = async () => {
    if (!screen.queryByRole('dialog')) {
      fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
    }
    await screen.findByRole('dialog');
  };

  it('shows profile source selection when no prior role exists', async () => {
    renderHome();
    await ensureModalOpen();
    expect(await screen.findByText(/Choose Profile/i)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Local Profile/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /Login to Joomla/i })).toBeVisible();
  });

  it('skips role selection when a role was stored', () => {
    localStorage.setItem('ab:user-type', 'operative');
    localStorage.setItem(
      'characterInfo',
      JSON.stringify({ role: 'operative', name: 'Neo', level: 2, skills: [], faction: 'Aquila' }),
    );
    act(() => {
      renderHome();
    });
    fireEvent.click(screen.getByRole('button', { name: /edit profile/i }));
    expect(screen.getByText(/Operative Profile/i)).toBeInTheDocument();
  });

  it('persists operative choice and moves to profile form', async () => {
    renderHome();
    await ensureModalOpen();
    fireEvent.click(await screen.findByRole('button', { name: /Local Profile/i }));
    expect(localStorage.getItem('ab:user-type')).toBe('operative');
    expect(await screen.findByText(/Operative Profile/i)).toBeVisible();
  });

  it('saves operative profile and closes modal', async () => {
    renderHome();
    await ensureModalOpen();
    fireEvent.click(await screen.findByRole('button', { name: /Local Profile/i }));
    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'Neo' } });
    fireEvent.change(screen.getByLabelText(/Level/i), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Aquila' }));
    fireEvent.click(screen.getByRole('button', { name: /Save\s*Profile/i }));

    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    const stored = JSON.parse(localStorage.getItem('characterInfo') || '{}');
    expect(stored.name).toBe('Neo');
    expect(stored.role).toBe('operative');
    expect(stored.faction).toBe('Aquila');
  });

  it('resets profile and role marker on reset', async () => {
    localStorage.setItem('ab:user-type', 'operative');
    localStorage.setItem(
      'characterInfo',
      JSON.stringify({ role: 'operative', name: 'Neo', level: 2, skills: [], faction: 'Dugo' }),
    );

    renderHome();
    await ensureModalOpen();
    fireEvent.click(await screen.findByRole('button', { name: /Reset/i }));

    expect(localStorage.getItem('characterInfo')).toBeNull();
    expect(localStorage.getItem('ab:user-type')).toBeNull();
    expect(await screen.findByText(/Choose Profile/i)).toBeInTheDocument();
  });
});
