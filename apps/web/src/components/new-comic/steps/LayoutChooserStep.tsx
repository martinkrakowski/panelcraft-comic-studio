import React from 'react';
import Image from 'next/image';
import { Loader2, Layers, Check, XCircle } from 'lucide-react';
import { Button } from '@panelcraft/ui';
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
        <div className="space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500 mx-auto" />
          <h1 className={styles.heroHeading}>
            Varo is dreaming up your world...
          </h1>
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
              <button
                type="button"
                key={layout}
                onClick={() => handleLayoutSelect(layout)}
                className="bg-slate-900/30 border border-slate-700 rounded-lg p-4 hover:border-violet-500 transition-colors text-left"
              >
                <div className="bg-slate-800 rounded h-24 mb-2 flex items-center justify-center">
                  <Layers className="h-6 w-6 text-slate-500" />
                </div>
                <p className="text-xs text-slate-300 font-medium">{layout}</p>
              </button>
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
