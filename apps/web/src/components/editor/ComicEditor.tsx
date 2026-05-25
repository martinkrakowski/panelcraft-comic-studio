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
import { ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import { EditorSidebar } from './EditorSidebar';
import { HITLReviewPanel } from './HITLReviewPanel';
import { PanelsGrid } from './PanelsGrid';

interface ComicEditorProps {
  projectId: string;
}

export function ComicEditor({ projectId }: ComicEditorProps) {
  const { toast } = useToast();
  const { project, loading, error, refetch, refreshSilent } =
    useProject(projectId);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [selectingLayout, setSelectingLayout] = useState(false);

  const onSelectLayout = async (layout: string) => {
    setSelectingLayout(true);
    try {
      await api.selectLayout(projectId, layout);
      toast({
        variant: 'success',
        title: 'Layout selected',
        description: 'Resuming workflow to generate panels.',
      });
      refreshSilent();
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
      refreshSilent();
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
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <div className="flex flex-col lg:flex-row gap-[var(--panelcraft-gutter-space,1.5rem)] items-start">
          <Skeleton className="h-96 w-full lg:w-[var(--panelcraft-sidebar-width,370px)] shrink-0 rounded-xl" />
          <div className="flex-1 space-y-6">
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
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-full text-red-400">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-semibold">Failed to Load Project</h2>
        <p className="text-slate-400 max-w-sm text-sm">
          {error?.message || 'This project could not be loaded.'}
        </p>
        <Link href="/" className={buttonVariants({ variant: 'outline' })}>
          Back to Dashboard
        </Link>
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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 pb-4 border-b border-slate-800/60">
        <div className="space-y-1">
          <Link
            href="/"
            className="inline-flex items-center text-xs text-slate-400 hover:text-white transition-colors duration-200 group mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1 transform group-hover:-translate-x-0.5 transition-transform duration-200" />
            Back to Dashboard
          </Link>
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold tracking-tight text-white line-clamp-1">
              {project.prompt}
            </h1>
            <ProjectStatusBadge status={project.status} />
          </div>
          <p className="text-xs text-slate-500">Project ID: {project.id}</p>
        </div>
        {(project.status === 'created' || project.status === 'processing') && (
          <div className="flex items-center space-x-2 text-xs font-semibold text-indigo-400 bg-indigo-950/20 border border-indigo-500/20 px-3 py-1.5 rounded-full shadow-sm animate-pulse">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            <span>AI generating story & images...</span>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-[var(--panelcraft-gutter-space,1.5rem)] items-start">
        <EditorSidebar
          completedPanelCount={completedPanelCount}
          panelCount={project.panelCount}
          progressPercent={progressPercent}
          characterBible={project.characterBible}
        />

        <div className="flex-1 space-y-6">
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
          <PanelsGrid panels={project.panels} />
        </div>
      </div>
    </div>
  );
}
