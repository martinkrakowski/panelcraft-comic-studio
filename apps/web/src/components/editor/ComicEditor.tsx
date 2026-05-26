'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useProject } from '../../lib/hooks/useProject';
import {
  submitReviewSchema,
  type SubmitReviewFormValues,
} from '../../lib/validation/form-schemas';
import {
  ProjectStatusBadge,
  buttonVariants,
  AppCanvasTwoPane,
  ContentPanelFooter,
} from '@panelcraft/ui';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { EditorSidebar } from './EditorSidebar';
import { HITLReviewPanel } from './HITLReviewPanel';
import { PanelsGrid } from './PanelsGrid';
import { ProjectStatusStrip } from './ProjectStatusStrip';
import { useEditorActions } from './hooks/useEditorActions';
import { EditorLoadingState, EditorErrorState } from './EditorStates';
import { EditPanelDialog } from './panel-edit/EditPanelDialog';

interface ComicEditorProps {
  projectId: string;
}

/**
 * Project editor view for an existing comic. Renders the two-pane canvas
 * with the editor sidebar, status strip, optional layout chooser, HITL
 * review form for in-progress panels, and the generated panels grid.
 * Polling and per-panel regeneration are delegated to `useEditorActions`.
 *
 * @param props.projectId - ID of the project to load and edit.
 * @returns The editor canvas, or a loading/error state while the project resolves.
 */
export function ComicEditor({ projectId }: ComicEditorProps) {
  const { project, loading, error, refreshSilent } = useProject(projectId);

  const { register, handleSubmit, setValue, reset } =
    useForm<SubmitReviewFormValues>({
      resolver: zodResolver(submitReviewSchema),
      defaultValues: { approved: true, comment: '' },
    });

  const {
    onSelectLayout,
    onRegeneratePanel,
    onSubmitReview,
    selectingLayout,
    regeneratingPanelIndex,
    submittingReview,
  } = useEditorActions({
    projectId,
    refreshSilent,
    resetForm: reset,
  });

  // The Edit dialog stores the panel index it's targeting; the actual panel
  // payload is looked up from `project.panels` at render time so it stays
  // fresh as polling updates the project.
  const [editingPanelIndex, setEditingPanelIndex] = useState<number | null>(
    null
  );

  if (loading) {
    return <EditorLoadingState />;
  }

  if (error || !project) {
    return <EditorErrorState message={error?.message} />;
  }

  // Only surface HITL review when project is in pending_review (otherwise
  // panels that finished generating in a completed comic would resurrect
  // the review form and trigger 400s on the next approve click).
  const activeReviewPanel =
    project.status === 'pending_review'
      ? project.panels.find((p) => p.status === 'generated')
      : undefined;
  const completedPanelCount = project.panels.filter(
    (p) => p.status === 'completed'
  ).length;
  const progressPercent =
    project.panelCount > 0
      ? (completedPanelCount / project.panelCount) * 100
      : 0;

  return (
    <AppCanvasTwoPane
      sidebar={
        <EditorSidebar
          completedPanelCount={completedPanelCount}
          panelCount={project.panelCount}
          progressPercent={progressPercent}
          characterBible={project.characterBible}
          layoutOptions={project.layoutOptions}
          selectingLayout={selectingLayout}
          selectedLayout={project.selectedLayout}
          onSelectLayout={onSelectLayout}
          prompt={project.prompt}
          coverImageUrl={project.coverImageUrl}
          genres={project.genres}
          tones={project.tones}
          styleReferences={project.styleReferences}
        />
      }
      topStrip={
        <>
          {/* Title row: prompt + status badge + ID. Back/View nav lives in footer. */}
          <div className="flex-shrink-0 px-4 pt-4 pb-3 flex flex-col gap-1 border-b border-slate-800/60">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold tracking-tight text-white line-clamp-1">
                {project.prompt}
              </h1>
              <ProjectStatusBadge status={project.status} />
            </div>
            <p className="text-xs text-slate-500">Project ID: {project.id}</p>
          </div>

          <ProjectStatusStrip
            status={project.status}
            completedPanelCount={completedPanelCount}
            panelCount={project.panelCount}
          />
        </>
      }
      footer={
        <ContentPanelFooter>
          <Link
            href="/"
            scroll={false}
            className={`${buttonVariants({ variant: 'outline', size: 'sm' })} inline-flex items-center`}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          {project.status === 'completed' ? (
            <Link
              href={`/projects/${project.id}/view`}
              scroll={false}
              className={`${buttonVariants({ size: 'sm' })} bg-emerald-600 hover:bg-emerald-500 text-white inline-flex items-center gap-1.5`}
            >
              <BookOpen className="h-4 w-4" />
              View comic page
            </Link>
          ) : (
            <span aria-hidden />
          )}
        </ContentPanelFooter>
      }
    >
      {/* Scrollable content area (layout chooser, review panel, grid).
          Restores the px-4 / pb-8 / space-y-6 that existed pre-refactor so
          cards and grids don't sit flush against the pane edges and have
          consistent internal spacing. Matches the padding used in the
          loading skeleton for a seamless loaded transition. */}
      <div className="px-4 pb-8 space-y-6">
        {activeReviewPanel && (
          <HITLReviewPanel
            activeReviewPanel={activeReviewPanel}
            register={register}
            handleSubmit={handleSubmit}
            setValue={setValue}
            onSubmitReview={onSubmitReview}
            submittingReview={submittingReview}
          />
        )}
        <PanelsGrid
          panels={project.panels}
          // Only expose per-panel regenerate once the comic is done — while
          // a panel is mid-HITL the user reviews via the top card, and
          // letting them double-trigger generation would race the worker.
          onRegenerate={
            project.status === 'completed' ? onRegeneratePanel : undefined
          }
          onEdit={
            project.status === 'completed' ? setEditingPanelIndex : undefined
          }
          regeneratingPanelIndex={regeneratingPanelIndex}
        />
      </div>

      <EditPanelDialog
        open={editingPanelIndex !== null}
        onOpenChange={(open) => {
          if (!open) setEditingPanelIndex(null);
        }}
        panel={
          editingPanelIndex !== null
            ? (project.panels.find((p) => p.index === editingPanelIndex) ??
              null)
            : null
        }
        onRegenerate={(panelIndex, feedback) =>
          onRegeneratePanel(panelIndex, feedback || undefined)
        }
        submitting={regeneratingPanelIndex !== null}
      />
    </AppCanvasTwoPane>
  );
}
