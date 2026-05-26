'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, ProjectStatusBadge } from '@panelcraft/ui';
import { Image as ImageIcon, Trash2 } from 'lucide-react';
import type { ProjectSummaryDTO } from '@panelcraft/types';
import { DeleteProjectDialog } from './DeleteProjectDialog';
import { useDeleteProject } from './hooks/useDeleteProject';

interface DashboardCardProps {
  project: ProjectSummaryDTO;
}

/**
 * Single project tile on the dashboard grid. The card body is a link —
 * completed projects route to the read-only carousel view, anything else
 * routes to the editor (where in-progress shows panel grid + HITL, failed
 * shows the error/retry state).
 *
 * The delete affordance is rendered as a sibling button (not nested in the
 * link) so clicking it triggers the confirm dialog without navigating.
 *
 * Cover image (signed URL from the list endpoint) is rendered in a 4:3
 * frame with `object-cover` — xAI generates square covers (`xai-cover-image-ratio`
 * memory), so 4:3 crops less than 16:9 while still leaving room for a
 * gradient-shielded status badge.
 */
export function DashboardCard({ project }: DashboardCardProps) {
  const destination =
    project.status === 'completed'
      ? `/projects/${project.id}/view`
      : `/projects/${project.id}`;

  const [deleteOpen, setDeleteOpen] = useState(false);
  const { deleteProject, deleting } = useDeleteProject();

  return (
    <div className="relative group">
      <Link
        href={destination}
        scroll={false}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 rounded-xl"
      >
        <Card className="border-slate-700/60 group-hover:border-indigo-400/60 bg-slate-900/20 overflow-hidden flex flex-col h-full">
          <CardThumbnail
            coverImageUrl={project.coverImageUrl}
            status={project.status}
          />
          <div className="p-4 pr-12 space-y-1.5">
            <p className="text-sm font-medium text-white line-clamp-2 leading-snug min-h-[2.5rem]">
              {project.prompt || 'Untitled comic'}
            </p>
            <p className="text-xs text-slate-500">
              {project.panelCount}{' '}
              {project.panelCount === 1 ? 'panel' : 'panels'}
              <span className="mx-1.5 text-slate-700">·</span>
              {formatRelativeDate(project.createdAt)}
            </p>
          </div>
        </Card>
      </Link>
      <button
        type="button"
        aria-label={`Delete ${project.prompt || 'untitled comic'}`}
        onClick={() => setDeleteOpen(true)}
        disabled={deleting}
        className="absolute bottom-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <DeleteProjectDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        promptPreview={project.prompt}
        onConfirm={() => deleteProject(project.id)}
        deleting={deleting}
      />
    </div>
  );
}

interface CardThumbnailProps {
  coverImageUrl?: string | null;
  status: ProjectSummaryDTO['status'];
}

/**
 * 4:3 cover frame with status badge in the top-right. Gradient overlay at the
 * top ensures badge legibility regardless of cover image brightness.
 */
function CardThumbnail({ coverImageUrl, status }: CardThumbnailProps) {
  return (
    <div className="relative aspect-[4/3] bg-slate-950 overflow-hidden border-b border-slate-800/60">
      {coverImageUrl ? (
        <Image
          src={coverImageUrl}
          alt="Cover"
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-slate-700">
          <ImageIcon className="h-10 w-10" />
        </div>
      )}
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
      <div className="absolute top-2 right-2">
        <ProjectStatusBadge status={status} />
      </div>
    </div>
  );
}

/**
 * Human-friendly relative time (e.g. "3 days ago"). Falls back to the ISO
 * date if the browser doesn't support Intl.RelativeTimeFormat or the input
 * is unparseable.
 */
function formatRelativeDate(iso: string): string {
  try {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return iso;
    const diffMs = then - Date.now();
    const diffSec = Math.round(diffMs / 1000);
    const abs = Math.abs(diffSec);
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

    if (abs < 60) return rtf.format(diffSec, 'second');
    if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
    if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
    if (abs < 2592000) return rtf.format(Math.round(diffSec / 86400), 'day');
    if (abs < 31536000)
      return rtf.format(Math.round(diffSec / 2592000), 'month');
    return rtf.format(Math.round(diffSec / 31536000), 'year');
  } catch {
    return iso;
  }
}
