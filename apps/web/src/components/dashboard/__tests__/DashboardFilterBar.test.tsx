import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardFilterBar } from '../DashboardFilterBar';
import type { DashboardFilters } from '../hooks/useDashboardFilters';

// Radix dropdowns rely on pointer-capture + scrollIntoView, which jsdom omits.
beforeAll(() => {
  Element.prototype.hasPointerCapture = vi.fn();
  Element.prototype.setPointerCapture = vi.fn();
  Element.prototype.releasePointerCapture = vi.fn();
  Element.prototype.scrollIntoView = vi.fn();
});

const baseFilters: DashboardFilters = {
  search: '',
  genres: [],
  tones: [],
  status: 'all',
  dateRange: 'all',
};

interface SetupOptions {
  filters?: Partial<DashboardFilters>;
  availableGenres?: string[];
  availableTones?: string[];
  availableStatuses?: ('completed' | 'review' | 'in_progress' | 'failed')[];
}

function setup({
  filters = {},
  availableGenres = ['Fantasy', 'Sci-Fi'],
  availableTones = ['Dark', 'Epic'],
  availableStatuses = ['completed', 'failed'],
}: SetupOptions = {}) {
  const handlers = {
    setSearch: vi.fn(),
    toggleGenre: vi.fn(),
    toggleTone: vi.fn(),
    setStatus: vi.fn(),
    setDateRange: vi.fn(),
    clearAll: vi.fn(),
  };
  render(
    <DashboardFilterBar
      filters={{ ...baseFilters, ...filters }}
      availableGenres={availableGenres}
      availableTones={availableTones}
      availableStatuses={availableStatuses}
      activeCount={0}
      {...handlers}
    />
  );
  return handlers;
}

describe('DashboardFilterBar', () => {
  it('invokes setStatus with the chosen bucket when a status option is clicked', async () => {
    const user = userEvent.setup();
    const { setStatus } = setup();

    await user.click(screen.getByRole('button', { name: /all statuses/i }));
    await user.click(await screen.findByText('Completed'));

    expect(setStatus).toHaveBeenCalledWith('completed');
  });

  it('invokes setDateRange when a date option is clicked', async () => {
    const user = userEvent.setup();
    const { setDateRange } = setup();

    await user.click(screen.getByRole('button', { name: /all time/i }));
    await user.click(await screen.findByText('This week'));

    expect(setDateRange).toHaveBeenCalledWith('week');
  });

  it('invokes toggleGenre when a genre checkbox is clicked', async () => {
    const user = userEvent.setup();
    const { toggleGenre } = setup();

    await user.click(screen.getByRole('button', { name: /^genre/i }));
    await user.click(await screen.findByText('Fantasy'));

    expect(toggleGenre).toHaveBeenCalledWith('Fantasy');
  });

  it('hides the status filter when every project shares one bucket', () => {
    setup({ availableStatuses: ['completed'] });
    expect(
      screen.queryByRole('button', { name: /statuses/i })
    ).not.toBeInTheDocument();
  });

  it('hides a dimension that has no available options', () => {
    setup({ availableGenres: [], availableTones: [] });
    expect(
      screen.queryByRole('button', { name: /^genre/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^tag/i })
    ).not.toBeInTheDocument();
  });
});
