'use client';

import React from 'react';
import Link from 'next/link';
import { useWorkspace } from '../../providers/WorkspaceProvider';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  ProjectStatusBadge,
  Button,
  buttonVariants,
  Skeleton,
} from '@panelcraft/ui';
import {
  Calendar,
  Film,
  Plus,
  Sparkles,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

/**
 * Main application dashboard landing page component.
 * Renders the welcome banner, project summaries grid list, and empty creation placeholders.
 *
 * @component
 * @returns React.Element welcome card, creation button CTA, and grid cards.
 */
export function Dashboard() {
  const { projects, loadingProjects, errorProjects, refetchProjects } =
    useWorkspace();

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return 'Unknown Date';
    }
  };

  if (loadingProjects) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-10 w-48 bg-slate-800 rounded animate-pulse" />
          <div className="h-10 w-32 bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (errorProjects) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-full text-red-400">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-semibold">Failed to Load Projects</h2>
        <p className="text-slate-400 max-w-sm text-sm">
          {errorProjects.message ||
            'An error occurred while fetching your projects.'}
        </p>
        <Button onClick={refetchProjects} variant="outline" className="mt-2">
          Retry Loading
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Your Comic Studio
          </h1>
          <p className="text-slate-400 mt-1">
            Create, manage, and review AI-orchestrated panel storylines.
          </p>
        </div>
        <Link
          href="/new"
          className={buttonVariants({
            variant: 'default',
            size: 'default',
            className:
              'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 border-none font-semibold flex items-center gap-2',
          })}
        >
          <Plus className="h-4 w-4" />
          Create New Comic
        </Link>
      </div>

      {projects.length === 0 ? (
        /* Empty State */
        <Card className="flex flex-col items-center justify-center p-12 text-center border-dashed border-slate-800 bg-slate-900/20">
          <div className="p-4 bg-indigo-500/10 rounded-full text-indigo-400 mb-4 animate-bounce">
            <Sparkles className="h-10 w-10" />
          </div>
          <CardTitle className="text-xl font-bold text-white mb-2">
            No Comics Generated Yet
          </CardTitle>
          <CardDescription className="max-w-md mx-auto mb-6">
            Get started by entering a descriptive prompt. PanelCraft will
            outline your panels, structure characters, and generate scenes with
            human review at every step.
          </CardDescription>
          <Link
            href="/new"
            className={buttonVariants({
              variant: 'default',
              size: 'default',
              className:
                'bg-indigo-600 hover:bg-indigo-500 font-semibold flex items-center gap-2',
            })}
          >
            <Plus className="h-4 w-4" />
            Start Your First Comic
          </Link>
        </Card>
      ) : (
        /* Projects Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => {
            const hasReviewPending = project.status === 'pending_review';

            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                <Card
                  className={`cursor-pointer transition-all duration-300 relative group overflow-hidden ${
                    hasReviewPending
                      ? 'border-amber-500/40 shadow-amber-500/5 hover:border-amber-500/60'
                      : 'hover:scale-[1.01]'
                  }`}
                >
                  {/* Visual Accent Glow for review actions */}
                  {hasReviewPending && (
                    <div className="absolute top-0 right-0 h-1 w-full bg-amber-500 animate-pulse" />
                  )}

                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start space-x-2">
                      <ProjectStatusBadge status={project.status} />
                      <div className="flex items-center text-xs text-slate-500 space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(project.createdAt)}</span>
                      </div>
                    </div>
                    <CardTitle className="text-lg font-bold text-slate-100 line-clamp-2 mt-3 group-hover:text-indigo-400 transition-colors duration-200">
                      {project.prompt}
                    </CardTitle>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center space-x-1">
                        <Film className="h-3.5 w-3.5" />
                        <span>Length: {project.panelCount} Panels</span>
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="flex items-center justify-between pt-4 border-t border-slate-800/40">
                    <span className="text-xs text-indigo-400 font-semibold group-hover:underline flex items-center gap-1">
                      {hasReviewPending ? 'Review Panel' : 'View Project'}
                      <ArrowRight className="h-3 w-3 transform group-hover:translate-x-0.5 transition-transform duration-200" />
                    </span>
                  </CardFooter>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
