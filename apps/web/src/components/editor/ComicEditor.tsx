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
  Button,
  buttonVariants,
  AppCanvasTwoPane,
  ContentPanelFooter,
} from '@panelcraft/ui';
import {
  ArrowLeft,
  BookOpen,
  Sparkles,
  RefreshCw,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { EditorSidebar } from './EditorSidebar';
import { HITLReviewPanel } from './HITLReviewPanel';
import { FinalReviewPanel } from './FinalReviewPanel';
import { CoverReviewPanel } from './CoverReviewPanel';
import { PanelsGrid } from './PanelsGrid';
import { ProjectStatusStrip } from './ProjectStatusStrip';
import { useEditorActions } from './hooks/useEditorActions';
import { EditorLoadingState, EditorErrorState } from './EditorStates';
import { EditPanelDialog } from './panel-edit/EditPanelDialog';
import { RegenerateCompositionDialog } from './sidebar/RegenerateCompositionDialog';
import { RegenerateCoverDialog } from './sidebar/RegenerateCoverDialog';

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
    onSwapLayout,
    onExtendPanels,
    onShrinkPanels,
    onRegeneratePanel,
    onSubmitReview,
    onComposeFinalPage,
    onRegenerateCover,
    selectingLayout,
    swappingLayout,
    extendingPanels,
    shrinkingPanels,
    regeneratingPanelIndex,
    submittingReview,
    composingFinalPage,
    regeneratingCover,
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

  // Compose / regenerate dialog. Opens from the footer button; gets its
  // mode (compose vs regenerate) from whether a composedImageUrl exists
  // on the project at click time.
  const [composeDialogOpen, setComposeDialogOpen] = useState(false);
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);

  if (loading) {
    return <EditorLoadingState />;
  }

  if (error || !project) {
    return <EditorErrorState message={error?.message} />;
  }

  // Only surface HITL review when project is in pending_review (otherwise
  // panels that finished generating in a completed comic would resurrect
  // the review form and trigger 400s on the next approve click). The
  // extend pipeline emits `pending_review_extend` for the same purpose on
  // newly-added extension panels — same UI, different backend routing.
  const isReviewablePanelState =
    project.status === 'pending_review' ||
    project.status === 'pending_review_extend';
  const activeReviewPanel = isReviewablePanelState
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
          panels={project.panels}
          status={project.status}
          characterBible={project.characterBible}
          layoutOptions={project.layoutOptions}
          selectingLayout={selectingLayout}
          selectedLayout={project.selectedLayout}
          onSelectLayout={onSelectLayout}
          swappingLayout={swappingLayout}
          extendingPanels={extendingPanels}
          shrinkingPanels={shrinkingPanels}
          onSwapLayout={onSwapLayout}
          onExtendPanels={onExtendPanels}
          onShrinkPanels={onShrinkPanels}
          prompt={project.prompt}
          coverImageUrl={project.coverImageUrl}
          genres={project.genres}
          tones={project.tones}
          styleReferences={project.styleReferences}
          composedImageUrl={project.composedImageUrl}
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
            composedImageUrl={project.composedImageUrl}
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
          <div className="flex items-center gap-2">
            {/* Cover button: visible on settled `completed` projects (so
                the user can kick off a regen) and during the
                `regenerating_cover` worker phase (as a disabled spinner).
                Hidden once status reaches `pending_review_cover` because
                the review surface in the main editor area owns the
                Approve / Regenerate actions at that point. */}
            {(project.status === 'completed' ||
              project.status === 'regenerating_cover' ||
              regeneratingCover) &&
              project.coverImageUrl && (
                <CoverFooterButton
                  regenerating={
                    regeneratingCover || project.status === 'regenerating_cover'
                  }
                  onClick={() => setCoverDialogOpen(true)}
                />
              )}
            {(project.status === 'completed' ||
              project.status === 'pending_review_final' ||
              project.status === 'composing') && (
              <ComposeFooterButton
                hasComposition={Boolean(project.composedImageUrl)}
                composing={project.status === 'composing' || composingFinalPage}
                onClick={() => setComposeDialogOpen(true)}
              />
            )}
            {(project.status === 'completed' ||
              project.status === 'pending_review_final' ||
              project.status === 'pending_review_cover') && (
              <Link
                href={`/projects/${project.id}/view`}
                scroll={false}
                className={`${buttonVariants({ size: 'sm' })} bg-emerald-600 hover:bg-emerald-500 text-white inline-flex items-center gap-1.5`}
              >
                <BookOpen className="h-4 w-4" />
                View comic page
              </Link>
            )}
          </div>
        </ContentPanelFooter>
      }
    >
      {/* Scrollable content area (layout chooser, review panel, grid).
          Restores the px-4 / pb-8 / space-y-6 that existed pre-refactor so
          cards and grids don't sit flush against the pane edges and have
          consistent internal spacing. Matches the padding used in the
          loading skeleton for a seamless loaded transition. */}
      <div className="px-4 pb-8 space-y-6">
        {project.status === 'composing' ? (
          <ComposingCard />
        ) : project.status === 'regenerating_cover' ? (
          <RegeneratingCoverCard />
        ) : project.status === 'pending_review_cover' ? (
          <CoverReviewPanel
            coverImageUrl={project.coverImageUrl}
            submitting={submittingReview || regeneratingCover}
            onSubmit={async ({ approved, comment }) =>
              onSubmitReview({
                approved,
                comment: comment ?? '',
              })
            }
          />
        ) : project.status === 'pending_review_final' ? (
          <FinalReviewPanel
            composedImageUrl={project.composedImageUrl}
            panels={project.panels}
            selectedLayout={project.selectedLayout}
            panelCount={project.panelCount}
            submitting={submittingReview || composingFinalPage}
            onSubmit={async ({ approved, comment, composeFlavor }) =>
              onSubmitReview({
                approved,
                comment: comment ?? '',
                composeFlavor,
              })
            }
          />
        ) : (
          activeReviewPanel && (
            <HITLReviewPanel
              activeReviewPanel={activeReviewPanel}
              register={register}
              handleSubmit={handleSubmit}
              setValue={setValue}
              onSubmitReview={onSubmitReview}
              submittingReview={submittingReview}
            />
          )
        )}
        <PanelsGrid
          panels={project.panels}
          selectedLayout={project.selectedLayout}
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

      <RegenerateCompositionDialog
        open={composeDialogOpen}
        onOpenChange={setComposeDialogOpen}
        mode={project.composedImageUrl ? 'regenerate' : 'compose'}
        submitting={composingFinalPage}
        onRegenerate={async (regenFeedback, composeFlavor) => {
          await onComposeFinalPage({
            regenFeedback: regenFeedback || undefined,
            composeFlavor,
          });
          setComposeDialogOpen(false);
        }}
      />

      <RegenerateCoverDialog
        open={coverDialogOpen}
        onOpenChange={setCoverDialogOpen}
        coverImageUrl={project.coverImageUrl}
        submitting={regeneratingCover}
        onRegenerate={async (feedback) => {
          await onRegenerateCover(feedback || undefined);
          setCoverDialogOpen(false);
        }}
      />
    </AppCanvasTwoPane>
  );
}

interface CoverFooterButtonProps {
  regenerating: boolean;
  onClick: () => void;
}

/**
 * Footer CTA for re-rolling the cover. Mirrors the composition button's
 * visual language: a disabled spinner while regeneration is in flight,
 * an indigo-tinted refresh button otherwise. Hidden when there's no
 * existing cover to regenerate (handled by the parent's render guard).
 */
function CoverFooterButton({ regenerating, onClick }: CoverFooterButtonProps) {
  if (regenerating) {
    return (
      <Button
        type="button"
        disabled
        size="sm"
        className="bg-slate-700/60 text-white inline-flex items-center gap-1.5"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Regenerating cover…
      </Button>
    );
  }
  return (
    <Button
      type="button"
      onClick={onClick}
      size="sm"
      variant="outline"
      className="inline-flex items-center gap-1.5"
    >
      <RefreshCw className="h-4 w-4" />
      Regenerate cover
    </Button>
  );
}

interface ComposeFooterButtonProps {
  hasComposition: boolean;
  composing: boolean;
  onClick: () => void;
}

/**
 * Footer CTA for the AI final composition. Moved here from the sidebar
 * because the sidebar section gets pushed below the layout accordion and
 * was easy to overlook. Label flips between Compose / Regenerate based on
 * whether a composition already exists, and the button is replaced by a
 * non-interactive spinner state while the worker is mid-run.
 */
function ComposeFooterButton({
  hasComposition,
  composing,
  onClick,
}: ComposeFooterButtonProps) {
  if (composing) {
    return (
      <Button
        type="button"
        disabled
        size="sm"
        className="bg-violet-600/50 text-white inline-flex items-center gap-1.5"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        Composing…
      </Button>
    );
  }
  return (
    <Button
      type="button"
      onClick={onClick}
      size="sm"
      className={
        hasComposition
          ? 'bg-indigo-600 hover:bg-indigo-500 text-white inline-flex items-center gap-1.5'
          : 'bg-violet-600 hover:bg-violet-500 text-white inline-flex items-center gap-1.5'
      }
    >
      {hasComposition ? (
        <>
          <RefreshCw className="h-4 w-4" />
          Regenerate composition
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4" />
          Compose final page
        </>
      )}
    </Button>
  );
}

/**
 * In-flight placeholder shown above the panels grid while the worker
 * runs the AI composition. Borrows the same `animate-panel-busy` pulse
 * the per-panel regen tiles use so the editor surface has a single,
 * consistent visual language for "something is being generated".
 */
function ComposingCard() {
  return (
    <div className="rounded-xl border border-transparent animate-panel-busy bg-slate-950/40 overflow-hidden">
      <div className="px-5 py-4 flex items-center gap-2 text-violet-300">
        <Sparkles className="h-5 w-5" />
        <span className="text-xs font-semibold uppercase tracking-wider">
          Composing final page
        </span>
      </div>
      <div className="px-5 pb-5">
        <div className="relative w-full max-w-md mx-auto aspect-[2/3] rounded-lg border border-slate-800 bg-black overflow-hidden grid place-items-center">
          <div className="flex flex-col items-center gap-3 text-slate-500 text-sm">
            <ImageIcon className="h-10 w-10 text-slate-700 animate-pulse" />
            <span>The AI is composing your comic page…</span>
            <span className="text-[11px] text-slate-600">
              Usually takes 30–60 seconds. You can leave this page open.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * In-flight placeholder for cover regeneration. Mirrors `ComposingCard`
 * — same animate-panel-busy treatment, same portrait frame — but with
 * cover-specific copy and a slightly tighter expected runtime. Pairs
 * with `CoverReviewPanel` once the worker finishes (status transitions
 * `regenerating_cover` → `pending_review_cover`).
 */
function RegeneratingCoverCard() {
  return (
    <div className="rounded-xl border border-transparent animate-panel-busy bg-slate-950/40 overflow-hidden">
      <div className="px-5 py-4 flex items-center gap-2 text-violet-300">
        <Sparkles className="h-5 w-5" />
        <span className="text-xs font-semibold uppercase tracking-wider">
          Regenerating cover
        </span>
      </div>
      <div className="px-5 pb-5">
        <div className="relative w-full max-w-sm mx-auto aspect-[2/3] rounded-lg border border-slate-800 bg-black overflow-hidden grid place-items-center">
          <div className="flex flex-col items-center gap-3 text-slate-500 text-sm">
            <ImageIcon className="h-10 w-10 text-slate-700 animate-pulse" />
            <span>The AI is rendering a new cover…</span>
            <span className="text-[11px] text-slate-600">
              Usually takes 10–20 seconds. You can leave this page open.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
