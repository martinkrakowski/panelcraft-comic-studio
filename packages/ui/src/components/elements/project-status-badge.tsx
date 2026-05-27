import * as React from 'react';
import { Badge } from './badge';
import type { ProjectStatus } from '@panelcraft/types';

/**
 * Maps a `ProjectStatus` to the Badge variant that visually communicates
 * lifecycle phase: `success` (completed), `warning` (awaiting human review),
 * `destructive` (failed), `default` (in-flight / pre-terminal), and
 * `secondary` for any unrecognized future state.
 *
 * @param status - One of: `created`, `pending_creation`, `processing`,
 *   `pending_layout`, `pending_review`, `pending_review_extend`,
 *   `extending`, `completed`, `failed`.
 * @returns A Badge variant string consumable by `<Badge variant=…>`.
 */
export function getProjectStatusVariant(status: ProjectStatus) {
  switch (status) {
    case 'completed':
      return 'success';
    case 'pending_review':
    case 'pending_review_extend':
    case 'pending_review_final':
    case 'pending_review_cover':
      return 'warning';
    case 'failed':
      return 'destructive';
    case 'created':
    case 'pending_creation':
    case 'processing':
    case 'pending_layout':
    case 'extending':
    case 'composing':
    case 'regenerating_cover':
      return 'default';
    default:
      return 'secondary';
  }
}

/**
 * Renders a human-readable label for the workflow status. Unknown statuses
 * fall through to the raw value so we don't lose information for newly
 * introduced lifecycle phases.
 *
 * @param status - Same `ProjectStatus` values as `getProjectStatusVariant`.
 * @returns A title-cased label (e.g. `'Pending Review'`, `'Adding Panels'`).
 */
export function formatProjectStatus(status: ProjectStatus): string {
  switch (status) {
    case 'created':
      return 'Created';
    case 'pending_creation':
      return 'Pending Creation';
    case 'processing':
      return 'Processing';
    case 'pending_layout':
      return 'Pending Layout';
    case 'pending_review':
      return 'Pending Review';
    case 'pending_review_extend':
      return 'Review New Panel';
    case 'extending':
      return 'Adding Panels';
    case 'composing':
      return 'Composing Page';
    case 'pending_review_final':
      return 'Review Final Page';
    case 'regenerating_cover':
      return 'Regenerating Cover';
    case 'pending_review_cover':
      return 'Review New Cover';
    case 'completed':
      return 'Completed';
    case 'failed':
      return 'Failed';
    default:
      return status;
  }
}

export interface ProjectStatusBadgeProps {
  status: ProjectStatus;
  className?: string;
}

export function ProjectStatusBadge({
  status,
  className,
}: ProjectStatusBadgeProps) {
  return (
    <Badge variant={getProjectStatusVariant(status)} className={className}>
      {formatProjectStatus(status)}
    </Badge>
  );
}
