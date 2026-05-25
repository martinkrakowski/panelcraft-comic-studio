'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useProject } from '../../lib/hooks/useProject';
import api from '../../lib/api';
import {
  submitReviewSchema,
  type SubmitReviewFormValues,
} from '../../lib/validation/form-schemas';
import {
  ProjectStatusBadge,
  buttonVariants,
  useToast,
  Skeleton,
} from '@panelcraft/ui';
import { ArrowLeft, AlertCircle, BookOpen } from 'lucide-react';
import { EditorSidebar } from './EditorSidebar';
import { HITLReviewPanel } from './HITLReviewPanel';
import { PanelsGrid } from './PanelsGrid';
import { ProjectStatusStrip } from './ProjectStatusStrip';

interface ComicEditorProps {
  projectId: string;
}

export function ComicEditor({ projectId }: ComicEditorProps) {
  const { toast } = useToast();
  const { project, loading, error, refreshSilent } =
    useProject(projectId);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [selectingLayout, setSelectingLayout] = useState(false);
  const [regeneratingPanelIndex, setRegeneratingPanelIndex] = useState<
    number | null
  >(null);

  const onSelectLayout = async (layout: string) => {
    setSelectingLayout(true);
    try {
      await api.selectLayout(projectId, layout);
      toast({
        variant: 'success',
        title: 'Layout selected',
        description: 'Resuming workflow to generate panels.',
      });
      await refreshSilent();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Layout selection failed',
        description: err instanceof Error ? err.message : 'An error occurred.',
      });
    } finally {
      setSelectingLayout(false);
    }
  };

  const { register, handleSubmit, setValue, reset } =
    useForm<SubmitReviewFormValues>({
      resolver: zodResolver(submitReviewSchema),
      defaultValues: { approved: true, comment: '' },
    });

  const onRegeneratePanel = async (panelIndex: number) => {
    if (regeneratingPanelIndex !== null) return;
    setRegeneratingPanelIndex(panelIndex);
    try {
      await api.regeneratePanel(projectId, panelIndex);
      toast({
        variant: 'success',
        title: 'Regenerating panel',
        description: `Panel ${panelIndex + 1} is being re-rendered.`,
      });
      await refreshSilent();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Regeneration failed',
        description: err instanceof Error ? err.message : 'An error occurred.',
      });
    } finally {
      setRegeneratingPanelIndex(null);
    }
  };

  const onSubmitReview = async (data: SubmitReviewFormValues) => {
    setSubmittingReview(true);
    try {
      await api.submitReview(projectId, {
        approved: data.approved,
        comment: data.comment || undefined,
      });
      toast({
        variant: 'success',
        title: data.approved ? 'Panel Approved!' : 'Regeneration Queued',
        description: data.approved
          ? 'Continuing comic generation workflow in the background.'
          : 'Regenerating the current panel with your feedback comments.',
      });
      reset({ approved: true, comment: '' });
      await refreshSilent();
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Review submission failed',
        description: err instanceof Error ? err.message : 'An error occurred.',
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col lg:flex-row gap-[var(--panelcraft-gutter-space)] overflow-hidden">
        {/* ambient gradient blurs (match NewComicWizard) */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" />

        {/* Sidebar skeleton (match flex variant chrome: transparent, no border) */}
        <div className="w-full lg:w-[var(--panelcraft-sidebar-width,370px)] shrink-0 overflow-y-auto p-4 pt-20 space-y-4">
          <div className="h-9 rounded bg-slate-800/80 border-b border-slate-700" />
          <Skeleton className="h-28 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>

        {/* Main content skeleton */}
        <div className="flex-1 flex flex-col overflow-hidden rounded-xl bg-slate-900/50 backdrop-blur-sm relative mt-16">
          <div className="flex-shrink-0 px-4 pt-4">
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="flex-shrink-0 px-4 py-3 border-b border-slate-800/60">
            <Skeleton className="h-6 w-64" />
          </div>
          {/* Status strip placeholder (prevents pop when real strip mounts) */}
          <div className="flex-shrink-0 h-12 px-4 bg-slate-900/30" />
          <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-6 pt-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-64 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="fixed inset-0 bg-slate-950 flex flex-col lg:flex-row gap-[var(--panelcraft-gutter-space)] overflow-hidden">
        {/* ambient gradient blurs (match NewComicWizard) */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" />

        {/* Empty sidebar slot for visual consistency (match flex variant: transparent, no border) */}
        <div className="w-full lg:w-[var(--panelcraft-sidebar-width,370px)] shrink-0 pt-20" />

        {/* Error content centered in main panel */}
        <div className="flex-1 flex flex-col overflow-hidden rounded-xl bg-slate-900/50 backdrop-blur-sm relative mt-16">
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="flex flex-col items-center justify-center text-center space-y-4 max-w-sm">
              <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-full text-red-400">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-semibold">Failed to Load Project</h2>
              <p className="text-slate-400 text-sm">
                {error?.message || 'This project could not be loaded.'}
              </p>
              <Link href="/" className={buttonVariants({ variant: 'outline' })}>
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
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
    <div className="fixed inset-0 bg-slate-950 flex flex-col lg:flex-row gap-[var(--panelcraft-gutter-space)] overflow-hidden">
      {/* ambient gradient blurs (match NewComicWizard) */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-violet-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" />

      <EditorSidebar
        completedPanelCount={completedPanelCount}
        panelCount={project.panelCount}
        progressPercent={progressPercent}
        characterBible={project.characterBible}
      />

      {/* Main content panel */}
      <div className="flex-1 flex flex-col overflow-hidden rounded-xl bg-slate-900/50 backdrop-blur-sm relative mt-16">
        {/* Back link (top-left of content area) */}
        <div className="flex-shrink-0 px-4 pt-4">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-slate-400 hover:text-slate-200 transition-colors duration-200 group"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>

        {/* Title row: prompt + status badge + ID + CTA */}
        <div className="flex-shrink-0 px-4 pt-2 pb-3 flex flex-col md:flex-row md:items-start md:justify-between gap-3 border-b border-slate-800/60">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold tracking-tight text-white line-clamp-1">
                {project.prompt}
              </h1>
              <ProjectStatusBadge status={project.status} />
            </div>
            <p className="text-xs text-slate-500">Project ID: {project.id}</p>
          </div>
          {project.status === 'completed' && (
            <Link
              href={`/projects/${project.id}/view`}
              className={`${buttonVariants({ size: 'sm' })} bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              View comic page
            </Link>
          )}
        </div>

        <ProjectStatusStrip
          status={project.status}
          completedPanelCount={completedPanelCount}
          panelCount={project.panelCount}
        />

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-6">
          {!project.selectedLayout &&
            project.layoutOptions &&
            project.layoutOptions.length > 0 && (
              <div className="bg-slate-900/40 border border-violet-500/30 rounded-xl p-6 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Choose a layout
                  </h2>
                  <p className="text-sm text-slate-400">
                    The AI suggested these layouts based on your story. Pick one
                    to continue.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {project.layoutOptions.map((layout) => (
                    <button
                      key={layout}
                      type="button"
                      disabled={selectingLayout}
                      onClick={() => onSelectLayout(layout)}
                      className="text-left p-4 rounded-lg border border-slate-700 bg-slate-800 hover:border-violet-500 hover:bg-violet-500/10 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {layout}
                    </button>
                  ))}
                </div>
              </div>
            )}
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
            regeneratingPanelIndex={regeneratingPanelIndex}
          />
        </div>
      </div>
    </div>
  );
}
