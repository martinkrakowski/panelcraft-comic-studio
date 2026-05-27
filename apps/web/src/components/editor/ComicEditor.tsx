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
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@panelcraft/ui';
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
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
              <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-white line-clamp-1">
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
            Dashboard
          </Link>
          <CompositionActionsMenu
            project={project}
            regeneratingCover={regeneratingCover}
            composingFinalPage={composingFinalPage}
            onCoverClick={() => setCoverDialogOpen(true)}
            onComposeClick={() => setComposeDialogOpen(true)}
          />
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

interface CompositionActionsMenuProps {
  project: NonNullable<ReturnType<typeof useProject>['project']>;
  regeneratingCover: boolean;
  composingFinalPage: boolean;
  onCoverClick: () => void;
  onComposeClick: () => void;
}

/**
 * Editor footer's right-side action menu. Collapses cover regen, final
 * composition, and "View comic page" into one dropdown so the footer fits
 * on narrow viewports (three flex-row buttons used to overflow ~430px
 * mobile widths). Items are conditionally listed based on project status,
 * mirroring the visibility rules of the original three discrete buttons:
 *
 * - Cover regen: shown when `completed` or `regenerating_cover` (or the
 *   action is currently in flight via the `regeneratingCover` flag), and
 *   only when a cover already exists.
 * - Compose: shown when `completed`, `pending_review_final`, or `composing`
 *   — label flips to "Regenerate composition" once a `composedImageUrl`
 *   exists.
 * - View comic page: shown when the comic is presentable
 *   (`completed`, `pending_review_final`, `pending_review_cover`).
 *
 * While an action is mid-flight the trigger shows a spinner and the
 * corresponding item is replaced with a disabled progress label. When no
 * items qualify, the entire menu is omitted from the footer.
 */
function CompositionActionsMenu({
  project,
  regeneratingCover,
  composingFinalPage,
  onCoverClick,
  onComposeClick,
}: CompositionActionsMenuProps) {
  const coverInFlight =
    regeneratingCover || project.status === 'regenerating_cover';
  const composeInFlight = composingFinalPage || project.status === 'composing';

  const showCoverItem =
    (project.status === 'completed' || coverInFlight) &&
    Boolean(project.coverImageUrl);
  const showComposeItem =
    project.status === 'completed' ||
    project.status === 'pending_review_final' ||
    composeInFlight;
  const showViewItem =
    project.status === 'completed' ||
    project.status === 'pending_review_final' ||
    project.status === 'pending_review_cover';

  const hasAnyItem = showCoverItem || showComposeItem || showViewItem;
  if (!hasAnyItem) return null;

  const anyInFlight = coverInFlight || composeInFlight;
  const hasComposition = Boolean(project.composedImageUrl);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          size="sm"
          className="bg-violet-600 hover:bg-violet-500 text-white inline-flex items-center gap-1.5"
        >
          {anyInFlight ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Composition Actions
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[14rem]">
        {showCoverItem &&
          (coverInFlight ? (
            <DropdownMenuItem disabled>
              <Loader2 className="h-4 w-4 animate-spin" />
              Regenerating cover…
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={onCoverClick}>
              <RefreshCw className="h-4 w-4" />
              Regenerate cover
            </DropdownMenuItem>
          ))}
        {showComposeItem &&
          (composeInFlight ? (
            <DropdownMenuItem disabled>
              <Loader2 className="h-4 w-4 animate-spin" />
              Composing…
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={onComposeClick}>
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
            </DropdownMenuItem>
          ))}
        {showViewItem && (showCoverItem || showComposeItem) && (
          <DropdownMenuSeparator />
        )}
        {showViewItem && (
          <DropdownMenuItem asChild>
            <Link
              href={`/projects/${project.id}/view`}
              scroll={false}
              className="cursor-pointer"
            >
              <BookOpen className="h-4 w-4" />
              View comic page
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
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
