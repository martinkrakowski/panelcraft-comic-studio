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
}

export function LayoutChooserStep({
  isPolling,
  projectStatus,
  coverUrl,
  layoutOptions,
  handleLayoutSelect,
  onRetry,
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
