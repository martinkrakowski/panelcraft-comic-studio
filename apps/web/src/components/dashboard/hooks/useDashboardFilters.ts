import { useMemo, useState } from 'react';
import type { ProjectSummaryDTO } from '@panelcraft/types';
import { getProjectStatusVariant } from '@panelcraft/ui';
import { GENRE_OPTIONS, TONE_OPTIONS } from '../../../lib/wizard-constants';

/**
 * Date-range buckets for the dashboard date filter. Each (except `all`)
 * maps to a "created on or after" cutoff computed at filter time.
 */
export type DateRange = 'all' | 'today' | 'week' | 'month';

/**
 * Coarse status buckets the dashboard filter exposes. The project lifecycle
 * has ~13 granular statuses (see `ProjectStatus`); collapsing them into the
 * four user-meaningful groups the status badge already color-codes keeps the
 * filter legible. Bucketing reuses `getProjectStatusVariant` so the grouping
 * stays in lockstep with the badge.
 */
export type StatusBucket =
  | 'all'
  | 'completed'
  | 'review'
  | 'in_progress'
  | 'failed';

/** Non-`all` buckets in display order, used to order the available-status list. */
const STATUS_BUCKET_ORDER: Exclude<StatusBucket, 'all'>[] = [
  'completed',
  'review',
  'in_progress',
  'failed',
];

export interface DashboardFilters {
  search: string;
  genres: string[];
  tones: string[];
  status: StatusBucket;
  dateRange: DateRange;
}

const EMPTY_FILTERS: DashboardFilters = {
  search: '',
  genres: [],
  tones: [],
  status: 'all',
  dateRange: 'all',
};

/** Map a project's granular status onto one of the coarse filter buckets. */
function statusBucketOf(
  status: ProjectSummaryDTO['status']
): Exclude<StatusBucket, 'all'> {
  switch (getProjectStatusVariant(status)) {
    case 'success':
      return 'completed';
    case 'warning':
      return 'review';
    case 'destructive':
      return 'failed';
    default:
      // 'default' (in-flight) and 'secondary' (unknown future) both read as
      // work still in progress.
      return 'in_progress';
  }
}

/** Earliest `createdAt` (ms) that still passes the given range, or null for `all`. */
function dateCutoff(range: DateRange): number | null {
  if (range === 'all') return null;
  const now = Date.now();
  const day = 86_400_000;
  switch (range) {
    case 'today':
      return now - day;
    case 'week':
      return now - 7 * day;
    case 'month':
      return now - 30 * day;
  }
}

/** True when `selected` is empty (no constraint) or intersects `values`. */
function matchesAny(selected: string[], values: string[]): boolean {
  if (selected.length === 0) return true;
  return values.some((v) => selected.includes(v));
}

export interface UseDashboardFiltersResult {
  /** Projects passing every active filter, in their original order. */
  filtered: ProjectSummaryDTO[];
  filters: DashboardFilters;
  /** Genres present on at least one project, in canonical order. */
  availableGenres: string[];
  /** Tones present on at least one project, in canonical order. */
  availableTones: string[];
  /**
   * Distinct status buckets present across the projects, in display order.
   * The status filter only makes sense (and is only shown) when this has more
   * than one entry — otherwise every project shares a bucket and filtering
   * by status can't narrow anything.
   */
  availableStatuses: Exclude<StatusBucket, 'all'>[];
  setSearch: (value: string) => void;
  toggleGenre: (genre: string) => void;
  toggleTone: (tone: string) => void;
  setStatus: (status: StatusBucket) => void;
  setDateRange: (range: DateRange) => void;
  /** Count of non-default filter dimensions (drives the "Clear all" affordance). */
  activeCount: number;
  clearAll: () => void;
}

/**
 * Client-side dashboard filtering. The dashboard already loads the full
 * visible project list in one fetch (`useProjects`), so filtering happens in
 * memory here rather than via API query params.
 *
 * Dimensions combine with AND; multi-select dimensions (genre, tone) match
 * with OR within themselves. An empty/`all` dimension imposes no constraint.
 *
 * Note: the list endpoint truncates `prompt` to 50 chars, so the text search
 * matches only the visible portion of the prompt.
 */
export function useDashboardFilters(
  projects: ProjectSummaryDTO[]
): UseDashboardFiltersResult {
  const [filters, setFilters] = useState<DashboardFilters>(EMPTY_FILTERS);

  const filtered = useMemo(() => {
    const needle = filters.search.trim().toLowerCase();
    const cutoff = dateCutoff(filters.dateRange);

    return projects.filter((p) => {
      if (needle && !p.prompt.toLowerCase().includes(needle)) return false;
      if (!matchesAny(filters.genres, p.genres)) return false;
      if (!matchesAny(filters.tones, p.tones)) return false;
      if (
        filters.status !== 'all' &&
        statusBucketOf(p.status) !== filters.status
      )
        return false;
      if (cutoff !== null && new Date(p.createdAt).getTime() < cutoff)
        return false;
      return true;
    });
  }, [projects, filters]);

  // Filter options are derived from the full (unfiltered) project list so the
  // available choices stay stable while the user narrows the grid. Options that
  // match nothing are never offered — this prevents "dead" filters (e.g. a
  // status with zero matching projects) that make the control feel broken.
  const available = useMemo(() => {
    const genres = new Set<string>();
    const tones = new Set<string>();
    const buckets = new Set<Exclude<StatusBucket, 'all'>>();
    for (const p of projects) {
      p.genres.forEach((g) => genres.add(g));
      p.tones.forEach((t) => tones.add(t));
      buckets.add(statusBucketOf(p.status));
    }
    // Canonical order first, then any non-preset values (alphabetical).
    const order = (canonical: readonly string[], present: Set<string>) => [
      ...canonical.filter((v) => present.has(v)),
      ...[...present].filter((v) => !canonical.includes(v)).sort(),
    ];
    return {
      availableGenres: order(GENRE_OPTIONS, genres),
      availableTones: order(TONE_OPTIONS, tones),
      availableStatuses: STATUS_BUCKET_ORDER.filter((b) => buckets.has(b)),
    };
  }, [projects]);

  const toggle = (key: 'genres' | 'tones', value: string) =>
    setFilters((f) => ({
      ...f,
      [key]: f[key].includes(value)
        ? f[key].filter((v) => v !== value)
        : [...f[key], value],
    }));

  const activeCount =
    (filters.search.trim() ? 1 : 0) +
    (filters.genres.length > 0 ? 1 : 0) +
    (filters.tones.length > 0 ? 1 : 0) +
    (filters.status !== 'all' ? 1 : 0) +
    (filters.dateRange !== 'all' ? 1 : 0);

  return {
    filtered,
    filters,
    ...available,
    setSearch: (value) => setFilters((f) => ({ ...f, search: value })),
    toggleGenre: (genre) => toggle('genres', genre),
    toggleTone: (tone) => toggle('tones', tone),
    setStatus: (status) => setFilters((f) => ({ ...f, status })),
    setDateRange: (range) => setFilters((f) => ({ ...f, dateRange: range })),
    activeCount,
    clearAll: () => setFilters(EMPTY_FILTERS),
  };
}
