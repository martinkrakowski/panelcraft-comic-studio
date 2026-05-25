'use client';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Textarea,
} from '@panelcraft/ui';
import {
  CheckCircle,
  RefreshCw,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';
import type {
  UseFormRegister,
  UseFormHandleSubmit,
  UseFormSetValue,
} from 'react-hook-form';
import type { SubmitReviewFormValues } from '../../lib/validation/form-schemas';
import { ImageWithFallback } from './ImageWithFallback';

interface ReviewPanel {
  index: number;
  imageUrl?: string | null;
  prompt?: string;
}

interface HITLReviewPanelProps {
  activeReviewPanel: ReviewPanel;
  register: UseFormRegister<SubmitReviewFormValues>;
  handleSubmit: UseFormHandleSubmit<SubmitReviewFormValues>;
  setValue: UseFormSetValue<SubmitReviewFormValues>;
  onSubmitReview: (data: SubmitReviewFormValues) => Promise<void>;
  submittingReview: boolean;
}

export function HITLReviewPanel({
  activeReviewPanel,
  register,
  handleSubmit,
  setValue,
  onSubmitReview,
  submittingReview,
}: HITLReviewPanelProps) {
  return (
    <Card className="border-amber-500/50 bg-amber-950/10 shadow-lg shadow-amber-500/5 overflow-hidden">
      <div className="h-1 w-full bg-amber-500" />
      <CardHeader className="p-5">
        <div className="flex items-center space-x-2 text-amber-400 mb-1">
          <Sparkles className="h-5 w-5" />
          <span className="text-xs font-semibold uppercase tracking-wider">
            Human-in-the-Loop Interrupt
          </span>
        </div>
        <CardTitle className="text-lg font-bold text-white">
          Review Required: Panel {activeReviewPanel.index + 1}
        </CardTitle>
        <CardDescription className="text-slate-300 mt-1">
          AI generated the panel description and layout. Please approve the
          panel below, or reject it with feedback to trigger a recreation.
        </CardDescription>
      </CardHeader>

      <CardContent className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div className="space-y-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Generated Output
          </span>
          <div className="aspect-video relative rounded-lg border border-slate-800 bg-black flex items-center justify-center overflow-hidden">
            {activeReviewPanel.imageUrl ? (
              <ImageWithFallback
                src={activeReviewPanel.imageUrl}
                alt={`Panel ${activeReviewPanel.index + 1}`}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500 text-sm space-y-2">
                <ImageIcon className="h-8 w-8 text-slate-600 animate-pulse" />
                <span>Rendering image...</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Panel Prompt
            </span>
            <p className="text-sm text-slate-200 bg-slate-950/60 border border-slate-800 rounded-lg p-3 italic">
              &ldquo;{activeReviewPanel.prompt}&rdquo;
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmitReview)} className="space-y-3">
            <div className="space-y-1.5">
              <label
                htmlFor="feedback-comment"
                className="text-xs font-bold text-slate-400 uppercase tracking-wider block"
              >
                Feedback Comment
              </label>
              <Textarea
                id="feedback-comment"
                placeholder="Provide details if requesting regeneration (e.g. 'Change the detective's coat to red and add rain effects'). Leave empty if approving."
                className="h-20 text-xs resize-none"
                {...register('comment')}
              />
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Button
                type="submit"
                disabled={submittingReview}
                onClick={() => setValue('approved', true)}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 shadow-md shadow-indigo-600/10 flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="h-4 w-4" />
                Approve Panel
              </Button>
              <Button
                type="submit"
                disabled={submittingReview}
                onClick={() => setValue('approved', false)}
                variant="secondary"
                className="flex-1 text-slate-300 hover:text-white border border-slate-800 text-xs font-bold py-2 flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate Panel
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
