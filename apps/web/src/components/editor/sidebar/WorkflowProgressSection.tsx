'use client';

import { CollapsibleSection, Progress } from '@panelcraft/ui';

interface WorkflowProgressSectionProps {
  completedPanelCount: number;
  panelCount: number;
  progressPercent: number;
}

/**
 * "X / Y panels completed" status row + progress bar. Always rendered as
 * the primary workflow indicator at the top of the editor sidebar.
 */
export function WorkflowProgressSection({
  completedPanelCount,
  panelCount,
  progressPercent,
}: WorkflowProgressSectionProps) {
  return (
    <CollapsibleSection title="Workflow Progress" defaultOpen>
      <div className="space-y-3">
        <div className="flex justify-between text-xs text-slate-400">
          <span>
            Completed: {completedPanelCount} / {panelCount} Panels
          </span>
          <span className="font-semibold text-indigo-400">
            {Math.round(progressPercent)}%
          </span>
        </div>
        <Progress value={progressPercent} className="h-2" />
      </div>
    </CollapsibleSection>
  );
}
