import React from 'react';
import Image from 'next/image';
import { Check, XCircle } from 'lucide-react';
import { Button } from '@panelcraft/ui';
import { LayoutOptionTile } from '../../comic-page/LayoutOptionTile';
import styles from '../NewComicWizard.module.css';

export interface LayoutChooserStepProps {
  isPolling: boolean;
  projectStatus: string | null;
  coverUrl: string | null;
  layoutOptions: string[];
  handleLayoutSelect: (layout: string) => Promise<void>;
  onRetry: () => void;
  /**
   * Set when Step 0's Recommended Layouts picked a template — the wizard
   * auto-confirms it on the user's behalf, so we hide the chooser grid and
   * show a "Applying layout…" affordance instead of the layout tiles.
   */
  preferredLayoutId?: string | null;
}

/**
 * Wizard Step 4. Drives the brainstorm-result surface: while `isPolling` (or
 * `projectStatus` is null) renders the generating-cover loader; on `failed`
 * surfaces a retry CTA wired to `onRetry`; on `pending_layout` either auto-
 * applies the user's pre-pick (when `preferredLayoutId` is set — the parent
 * hook fires `handleLayoutSelect` for us, we just show "Applying layout…")
 * or renders the AI-suggested `layoutOptions` tiles that the user picks
 * from manually via `handleLayoutSelect`. Any other status shows the
 * "Project Created!" success screen before the parent navigates away.
 *
 * @returns The active step body for the brainstorm/layout-pick phase.
 */
export function LayoutChooserStep({
  isPolling,
  projectStatus,
  coverUrl,
  layoutOptions,
  handleLayoutSelect,
  onRetry,
  preferredLayoutId,
}: LayoutChooserStepProps) {
  return (
    <div className="space-y-6 text-center">
      {isPolling || !projectStatus ? (
        // Loader fills the available wizard content height and centers the
        // video + caption both axes so the brainstorm wait isn't visually
        // anchored at the top of the pane.
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
          <video
            autoPlay
            loop
            muted
            playsInline
            aria-label="Generating your comic"
            className="w-full max-w-md rounded-xl"
          >
            {/* WebM first so Chrome/Firefox/Edge pick the more efficient
                codec; .mov fallback for Safari versions / codecs that
                don't decode VP9. */}
            <source src="/generate-comic-loader.webm" type="video/webm" />
            <source src="/generate-comic-loader.mov" type="video/quicktime" />
          </video>
          <p className="text-slate-400">Generating cover and layout options</p>
        </div>
      ) : projectStatus === 'failed' ? (
        <div className="space-y-4">
          <XCircle className="h-8 w-8 text-red-500 mx-auto" />
          <h1 className={styles.heroHeading}>Project Creation Failed</h1>
          <p className="text-slate-400">
            Something went wrong while dreaming up your world. Please try again.
          </p>
          <Button
            type="button"
            onClick={onRetry}
            className="bg-violet-600 hover:bg-violet-500 text-white mt-4"
          >
            Try Again
          </Button>
        </div>
      ) : projectStatus === 'pending_layout' && preferredLayoutId ? (
        // Step 0 already picked a layout — useProjectCreation auto-fires the
        // selectLayout request on this state transition, so we keep the
        // loader running rather than re-showing the chooser tiles the user
        // never asked to see.
        <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
          <Check className="h-8 w-8 text-green-500" />
          <p className="text-slate-400">Applying your selected layout…</p>
        </div>
      ) : projectStatus === 'pending_layout' ? (
        <div className="space-y-6">
          <h1 className={styles.heroHeading}>Choose Your Layout</h1>
          {coverUrl && (
            <div className="w-full max-w-md mx-auto rounded-lg overflow-hidden border border-slate-700 relative aspect-[2/3]">
              <Image
                src={coverUrl}
                alt="Cover"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 450px"
                className="object-cover"
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            {layoutOptions.map((layout) => (
              <LayoutOptionTile
                key={layout}
                label={layout}
                onSelect={handleLayoutSelect}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <Check className="h-8 w-8 text-green-500 mx-auto" />
          <h1 className={styles.heroHeading}>Project Created!</h1>
          <p className="text-slate-400">Redirecting to editor...</p>
        </div>
      )}
    </div>
  );
}
