import * as React from 'react';
import { Badge } from './badge';
import type { ProjectStatus } from '@panelcraft/types';

export function getProjectStatusVariant(status: ProjectStatus) {
  switch (status) {
    case 'completed':
      return 'success';
    case 'pending_review':
      return 'warning';
    case 'failed':
      return 'destructive';
    case 'created':
    case 'pending_creation':
    case 'processing':
    case 'pending_layout':
      return 'default';
    default:
      return 'secondary';
  }
}

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
