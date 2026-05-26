'use client';

import type { ProjectSummaryDTO } from '@panelcraft/types';
import { DashboardCard } from './DashboardCard';

interface DashboardGridProps {
  projects: ProjectSummaryDTO[];
}

/**
 * Responsive grid of dashboard cards. 1 column on phone, 2 on tablet, 3 on
 * desktop. Each card is rendered by `<DashboardCard>` — this component just
 * lays them out.
 */
export function DashboardGrid({ projects }: DashboardGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {projects.map((project) => (
        <DashboardCard key={project.id} project={project} />
      ))}
    </div>
  );
}
