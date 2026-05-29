'use client';

import {
  Input,
  SelectionChip,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  buttonVariants,
} from '@panelcraft/ui';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import type {
  DateRange,
  StatusBucket,
  UseDashboardFiltersResult,
} from './hooks/useDashboardFilters';

const STATUS_OPTIONS: { value: StatusBucket; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'review', label: 'Needs review' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'failed', label: 'Failed' },
];

const DATE_OPTIONS: { value: DateRange; label: string }[] = [
  { value: 'all', label: 'All time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
];

type FilterBarProps = Pick<
  UseDashboardFiltersResult,
  | 'filters'
  | 'availableGenres'
  | 'availableTones'
  | 'availableStatuses'
  | 'setSearch'
  | 'toggleGenre'
  | 'toggleTone'
  | 'setStatus'
  | 'setDateRange'
  | 'activeCount'
  | 'clearAll'
>;

/**
 * Filter controls for the dashboard grid: free-text prompt search, multi-select
 * Genre and Tag (tone) dropdowns, and single-select Status and Date dropdowns.
 * Active selections are echoed as dismissable chips below the control row.
 *
 * Stateless — all filter state lives in `useDashboardFilters` (the parent owns
 * the hook so it can also derive the filtered grid + the "X of Y" count).
 */
export function DashboardFilterBar({
  filters,
  availableGenres,
  availableTones,
  availableStatuses,
  setSearch,
  toggleGenre,
  toggleTone,
  setStatus,
  setDateRange,
  activeCount,
  clearAll,
}: FilterBarProps) {
  const statusLabel =
    STATUS_OPTIONS.find((o) => o.value === filters.status)?.label ?? 'Status';
  const dateLabel =
    DATE_OPTIONS.find((o) => o.value === filters.dateRange)?.label ?? 'Date';

  // Only offer status filtering when projects actually span more than one
  // bucket — otherwise every option but "All" is a dead end (the common case
  // where every comic is `completed`). Keep "All" plus the present buckets.
  const statusOptions =
    availableStatuses.length > 1
      ? STATUS_OPTIONS.filter(
          (o) =>
            o.value === 'all' ||
            (availableStatuses as StatusBucket[]).includes(o.value)
        )
      : [];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[12rem] max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            type="search"
            value={filters.search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prompts…"
            aria-label="Search projects by prompt"
            className="pl-8 h-9"
          />
        </div>

        {availableGenres.length > 0 && (
          <MultiSelectDropdown
            label="Genre"
            options={availableGenres}
            selected={filters.genres}
            onToggle={toggleGenre}
          />
        )}
        {availableTones.length > 0 && (
          <MultiSelectDropdown
            label="Tag"
            options={availableTones}
            selected={filters.tones}
            onToggle={toggleTone}
          />
        )}
        {statusOptions.length > 0 && (
          <SingleSelectDropdown
            label={statusLabel}
            active={filters.status !== 'all'}
            options={statusOptions}
            value={filters.status}
            onSelect={setStatus}
          />
        )}
        <SingleSelectDropdown
          label={dateLabel}
          active={filters.dateRange !== 'all'}
          options={DATE_OPTIONS}
          value={filters.dateRange}
          onSelect={setDateRange}
        />

        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors px-1.5 py-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60"
          >
            <X className="h-3.5 w-3.5" />
            Clear all
          </button>
        )}
      </div>

      {(filters.genres.length > 0 || filters.tones.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {filters.genres.map((g) => (
            <SelectionChip
              key={`g-${g}`}
              variant="genre"
              label={g}
              onDismiss={() => toggleGenre(g)}
            />
          ))}
          {filters.tones.map((t) => (
            <SelectionChip
              key={`t-${t}`}
              variant="tone"
              label={t}
              onDismiss={() => toggleTone(t)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const triggerClass = (active: boolean) =>
  `${buttonVariants({ variant: 'outline', size: 'sm' })} h-9 gap-1.5 ${
    active
      ? 'border-indigo-400/60 text-indigo-200'
      : 'border-slate-700 text-slate-300'
  }`;

interface MultiSelectDropdownProps {
  label: string;
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}

/** Multi-select (Genre / Tag) dropdown — trigger shows a count when active. */
function MultiSelectDropdown({
  label,
  options,
  selected,
  onToggle,
}: MultiSelectDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={triggerClass(selected.length > 0)}>
        {label}
        {selected.length > 0 && (
          <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-500/30 px-1 text-[10px] font-semibold text-indigo-200">
            {selected.length}
          </span>
        )}
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((opt) => (
          <DropdownMenuCheckboxItem
            key={opt}
            checked={selected.includes(opt)}
            // Keep the menu open while toggling multiple values.
            onSelect={(e) => e.preventDefault()}
            onCheckedChange={() => onToggle(opt)}
          >
            {opt}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface SingleSelectDropdownProps<T extends string> {
  label: string;
  active: boolean;
  options: { value: T; label: string }[];
  value: T;
  onSelect: (value: T) => void;
}

/**
 * Single-select (Status / Date) dropdown. The UI's dropdown module exposes a
 * `DropdownMenuRadioGroup` but no radio item, so selection is rendered as plain
 * items with a trailing check on the active option.
 */
function SingleSelectDropdown<T extends string>({
  label,
  active,
  options,
  value,
  onSelect,
}: SingleSelectDropdownProps<T>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className={triggerClass(active)}>
        {label}
        <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {options.map((opt) => (
          <DropdownMenuItem
            key={opt.value}
            onSelect={() => onSelect(opt.value)}
            className="justify-between pr-2"
          >
            {opt.label}
            {opt.value === value && (
              <Check className="h-4 w-4 text-indigo-300" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
