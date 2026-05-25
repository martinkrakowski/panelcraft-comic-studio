'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Share2, AlertCircle } from 'lucide-react';
import { buttonVariants, Button, Skeleton, useToast } from '@panelcraft/ui';
import { useProject } from '../../lib/hooks/useProject';
import { resolveComicPageLayout } from '../../lib/comic-page-layouts';
import { ImageWithFallback } from '../editor/ImageWithFallback';

interface ComicPageViewProps {
  projectId: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Returns true when an image URL is served by a host that we know returns
 * `Access-Control-Allow-Origin` headers — currently just Supabase Storage.
 * Setting `crossOrigin` on an `<img>` whose host does NOT return CORS will
 * block the image, so we only opt in when we're confident the host will
 * cooperate (otherwise canvas export silently fails and the image works).
 */
function isCorsCapableHost(url: string | null | undefined): boolean {
  if (!url) return false;
  try {
    return new URL(url).hostname.endsWith('.supabase.co');
  } catch {
    return false;
  }
}

/**
 * Returns true if the image url should be re-fetched through our /api/image-proxy
 * for the PNG export pipeline. We only proxy hosts that don't send CORS
 * headers themselves — Supabase signed URLs work directly.
 */
function needsExportProxy(src: string | undefined | null): boolean {
  if (!src) return false;
  try {
    const u = new URL(src, window.location.href);
    if (u.origin === window.location.origin) return false;
    if (u.hostname.endsWith('.supabase.co')) return false;
    return true;
  } catch {
    return false;
  }
}

function proxiedUrl(src: string): string {
  return `${API_BASE}/api/image-proxy?url=${encodeURIComponent(src)}`;
}

/**
 * Wait for an <img> element to finish loading (or error) so that toPng sees
 * a settled DOM. img.decode() is the most reliable signal: it resolves once
 * the bitmap is fully decoded, which is what html-to-image needs.
 */
function waitForImage(img: HTMLImageElement): Promise<void> {
  if (img.complete && img.naturalWidth > 0)
    return img.decode().catch(() => undefined);
  return new Promise((resolve) => {
    const done = () => {
      img.removeEventListener('load', done);
      img.removeEventListener('error', done);
      resolve();
    };
    img.addEventListener('load', done, { once: true });
    img.addEventListener('error', done, { once: true });
  });
}

export function ComicPageView({ projectId }: ComicPageViewProps) {
  const { toast } = useToast();
  const { project, loading, error } = useProject(projectId);
  const pageRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const onDownload = async () => {
    if (!pageRef.current || exporting) return;
    setExporting(true);
    // html-to-image can hang indefinitely when a cross-origin image fails to
    // load (no CORS headers); without this race the button gets stuck on
    // "Exporting…" with no way to recover short of a refresh.
    const EXPORT_TIMEOUT_MS = 30000;

    // Temporarily rewrite any non-CORS image src through our /api/image-proxy
    // so html-to-image's fetchAsDataURL doesn't get blocked. We snapshot the
    // original srcs and restore them in `finally` no matter what.
    const imgs = Array.from(
      pageRef.current.querySelectorAll('img')
    ) as HTMLImageElement[];
    const originalSrcs: Array<{ img: HTMLImageElement; src: string }> = [];
    try {
      for (const img of imgs) {
        if (needsExportProxy(img.src)) {
          originalSrcs.push({ img, src: img.src });
          img.src = proxiedUrl(img.src);
        }
      }
      // Wait for any swapped images to finish loading via the proxy before
      // running the export, otherwise toPng captures empty placeholders.
      await Promise.all(imgs.map(waitForImage));

      // Dynamic import keeps html-to-image (and its canvas polyfills) out of
      // the editor/wizard bundles; only the /view route pays for it.
      const { toPng } = await import('html-to-image');
      const exportPromise = toPng(pageRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#020617',
      });
      const timeoutPromise = new Promise<string>((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                'Export timed out. The image proxy may be unreachable, or one ' +
                  'of the panel images is no longer available.'
              )
            ),
          EXPORT_TIMEOUT_MS
        );
      });
      const dataUrl = await Promise.race([exportPromise, timeoutPromise]);
      const link = document.createElement('a');
      const safeName =
        project?.prompt?.slice(0, 40).replace(/[^a-z0-9]+/gi, '-') || projectId;
      link.download = `${safeName}.png`;
      link.href = dataUrl;
      link.click();
      toast({
        variant: 'success',
        title: 'Downloaded',
        description: 'Comic page saved as PNG.',
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Download failed',
        description:
          err instanceof Error ? err.message : 'Could not export the page.',
      });
    } finally {
      // Always restore the visible srcs so the page keeps using the direct
      // (non-proxied) URL — the proxy is only meant for the export pipeline.
      for (const { img, src } of originalSrcs) img.src = src;
      setExporting(false);
    }
  };

  const onShare = async () => {
    if (typeof window === 'undefined') return;
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        variant: 'success',
        title: 'Link copied',
        description: 'Share URL copied to your clipboard.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'Copy failed',
        description: 'Select and copy the URL from the address bar instead.',
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="aspect-[2/3] w-full max-w-3xl mx-auto rounded-xl" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <div className="p-3 bg-red-950/20 border border-red-500/30 rounded-full text-red-400">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-semibold">Failed to load comic page</h2>
        <p className="text-slate-400 max-w-sm text-sm">
          {error?.message || 'Could not load the project for viewing.'}
        </p>
        <Link href="/" className={buttonVariants({ variant: 'outline' })}>
          Back to dashboard
        </Link>
      </div>
    );
  }

  // The view is meaningful once every panel has an image; until then,
  // direct the user back to the editor where the HITL flow lives.
  const renderablePanels = project.panels.filter((p) => !!p.imageUrl);
  if (renderablePanels.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
        <h2 className="text-xl font-semibold">Comic page not ready yet</h2>
        <p className="text-slate-400 max-w-sm text-sm">
          Approve all panels in the editor first, then return here to view the
          composed page.
        </p>
        <Link
          href={`/projects/${project.id}`}
          className={buttonVariants({ variant: 'outline' })}
        >
          Open editor
        </Link>
      </div>
    );
  }

  const layout = resolveComicPageLayout(
    project.selectedLayout,
    renderablePanels.length
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pb-4 border-b border-slate-800/60">
        <div className="space-y-1">
          <Link
            href={`/projects/${project.id}`}
            className="inline-flex items-center text-xs text-slate-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="h-3.5 w-3.5 mr-1 transform group-hover:-translate-x-0.5 transition-transform" />
            Back to editor
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-white line-clamp-1">
            {project.prompt}
          </h1>
          <p className="text-xs text-slate-500">
            Layout: <span className="text-slate-400">{layout.label}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onShare}
            className="text-xs"
          >
            <Share2 className="h-3.5 w-3.5 mr-1.5" />
            Copy link
          </Button>
          <Button
            type="button"
            onClick={onDownload}
            disabled={exporting}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            {exporting ? 'Exporting…' : 'Download PNG'}
          </Button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl">
        <div
          ref={pageRef}
          className="grid gap-2 bg-slate-950 p-4 rounded-xl border border-slate-800 shadow-2xl shadow-black/40"
          style={{
            gridTemplateColumns: layout.columns,
            gridTemplateRows: layout.rows,
            aspectRatio: layout.aspectRatio,
          }}
        >
          {renderablePanels.map((panel, idx) => (
            <div
              key={panel.id}
              className="relative overflow-hidden rounded-md border-2 border-slate-900 bg-black"
              style={
                layout.cellPlacements?.[idx]
                  ? { gridArea: layout.cellPlacements[idx] }
                  : undefined
              }
            >
              <ImageWithFallback
                src={panel.imageUrl as string}
                alt={`Panel ${panel.index + 1}`}
                className="w-full h-full object-cover"
                // Older projects still reference the xAI CDN (no CORS).
                // Only request CORS for hosts that we know serve it (our
                // Supabase signed URLs) — otherwise the image is blocked.
                crossOrigin={isCorsCapableHost(panel.imageUrl)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
