import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { ProjectSummaryDTO } from '@panelcraft/types';
import { useDashboardFilters } from '../useDashboardFilters';

const DAY = 86_400_000;

function project(overrides: Partial<ProjectSummaryDTO>): ProjectSummaryDTO {
  return {
    id: 'id',
    prompt: 'A space opera',
    panelCount: 3,
    status: 'completed',
    createdAt: new Date().toISOString(),
    isShared: false,
    isOwner: true,
    genres: [],
    tones: [],
    ...overrides,
  };
}

const PROJECTS: ProjectSummaryDTO[] = [
  project({
    id: 'a',
    prompt: 'Knight saves the realm',
    status: 'completed',
    genres: ['Fantasy'],
    tones: ['Epic'],
    createdAt: new Date(Date.now() - 2 * DAY).toISOString(),
  }),
  project({
    id: 'b',
    prompt: 'Robot uprising in Neo Tokyo',
    status: 'failed',
    genres: ['Sci-Fi'],
    tones: ['Dark'],
    createdAt: new Date(Date.now() - 10 * DAY).toISOString(),
  }),
  project({
    id: 'c',
    prompt: 'Detective in the rain',
    status: 'processing',
    genres: ['Noir', 'Mystery'],
    tones: ['Gritty'],
    createdAt: new Date(Date.now() - 40 * DAY).toISOString(),
  }),
];

describe('useDashboardFilters', () => {
  it('returns all projects with no active filters', () => {
    const { result } = renderHook(() => useDashboardFilters(PROJECTS));
    expect(result.current.filtered).toHaveLength(3);
    expect(result.current.activeCount).toBe(0);
  });

  it('matches search against the prompt, case-insensitively', () => {
    const { result } = renderHook(() => useDashboardFilters(PROJECTS));
    act(() => result.current.setSearch('ROBOT'));
    expect(result.current.filtered.map((p) => p.id)).toEqual(['b']);
    expect(result.current.activeCount).toBe(1);
  });

  it('ORs within the genre dimension', () => {
    const { result } = renderHook(() => useDashboardFilters(PROJECTS));
    act(() => result.current.toggleGenre('Fantasy'));
    act(() => result.current.toggleGenre('Sci-Fi'));
    expect(result.current.filtered.map((p) => p.id).sort()).toEqual(['a', 'b']);
  });

  it('toggles a genre off when selected twice', () => {
    const { result } = renderHook(() => useDashboardFilters(PROJECTS));
    act(() => result.current.toggleGenre('Fantasy'));
    expect(result.current.filtered).toHaveLength(1);
    act(() => result.current.toggleGenre('Fantasy'));
    expect(result.current.filtered).toHaveLength(3);
    expect(result.current.activeCount).toBe(0);
  });

  it('buckets granular status into coarse filter groups', () => {
    const { result } = renderHook(() => useDashboardFilters(PROJECTS));
    act(() => result.current.setStatus('failed'));
    expect(result.current.filtered.map((p) => p.id)).toEqual(['b']);
    act(() => result.current.setStatus('in_progress'));
    expect(result.current.filtered.map((p) => p.id)).toEqual(['c']);
  });

  it('filters by date cutoff', () => {
    const { result } = renderHook(() => useDashboardFilters(PROJECTS));
    act(() => result.current.setDateRange('week'));
    expect(result.current.filtered.map((p) => p.id)).toEqual(['a']);
    act(() => result.current.setDateRange('month'));
    expect(result.current.filtered.map((p) => p.id).sort()).toEqual(['a', 'b']);
  });

  it('ANDs across dimensions', () => {
    const { result } = renderHook(() => useDashboardFilters(PROJECTS));
    act(() => result.current.toggleTone('Dark'));
    act(() => result.current.setStatus('completed'));
    // 'b' has tone Dark but status failed → excluded.
    expect(result.current.filtered).toHaveLength(0);
  });

  it('derives available options from the projects, in canonical order', () => {
    const { result } = renderHook(() => useDashboardFilters(PROJECTS));
    // Canonical GENRE_OPTIONS order: Fantasy before Sci-Fi before Noir/Mystery.
    expect(result.current.availableGenres).toEqual([
      'Fantasy',
      'Sci-Fi',
      'Noir',
      'Mystery',
    ]);
    expect(result.current.availableTones).toEqual(['Dark', 'Gritty', 'Epic']);
  });

  it('reports every distinct status bucket present', () => {
    const { result } = renderHook(() => useDashboardFilters(PROJECTS));
    // a=completed, b=failed, c=processing(in_progress).
    expect(result.current.availableStatuses.sort()).toEqual([
      'completed',
      'failed',
      'in_progress',
    ]);
  });

  it('reports a single bucket when all projects share a status', () => {
    const allCompleted = PROJECTS.map((p) => ({
      ...p,
      status: 'completed' as const,
    }));
    const { result } = renderHook(() => useDashboardFilters(allCompleted));
    expect(result.current.availableStatuses).toEqual(['completed']);
  });

  it('clears every dimension at once', () => {
    const { result } = renderHook(() => useDashboardFilters(PROJECTS));
    act(() => result.current.setSearch('robot'));
    act(() => result.current.toggleGenre('Sci-Fi'));
    act(() => result.current.setStatus('failed'));
    expect(result.current.activeCount).toBe(3);
    act(() => result.current.clearAll());
    expect(result.current.activeCount).toBe(0);
    expect(result.current.filtered).toHaveLength(3);
  });
});
