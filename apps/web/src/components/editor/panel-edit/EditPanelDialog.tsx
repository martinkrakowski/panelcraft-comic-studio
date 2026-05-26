'use client';

import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Textarea,
} from '@panelcraft/ui';
import { RefreshCw, Image as ImageIcon } from 'lucide-react';
import { ImageWithFallback } from '../ImageWithFallback';

export interface EditPanelTarget {
  index: number;
  imageUrl?: string | null;
  prompt?: string;
}

interface EditPanelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The panel being edited. `null` when no edit is active (dialog closed). */
  panel: EditPanelTarget | null;
  /**
   * Called when the user submits the form. The feedback string is appended
   * to the panel prompt server-side for this regeneration only.
   */
  onRegenerate: (panelIndex: number, feedback: string) => void | Promise<void>;
  /** Disables the action while a regen request is in flight. */
  submitting?: boolean;
}

/**
 * Modal that surfaces a HITL-style review of a single completed panel and
 * lets the reviewer supply additional feedback before triggering a
 * regeneration. The feedback is appended to the panel prompt server-side
 * for this regen only; the persisted prompt is unchanged so the next
 * regen reverts unless new feedback is supplied.
 *
 * The form is keyed by `panel.index` so React remounts (and clears the
 * feedback textarea) whenever the user targets a different panel — no
 * effect needed to reset stale notes.
 */
export function EditPanelDialog({
  open,
  onOpenChange,
  panel,
  onRegenerate,
  submitting,
}: EditPanelDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Panel {panel ? panel.index + 1 : ''}</DialogTitle>
          <DialogDescription>
            Provide feedback to guide the next regeneration. The original prompt
            stays intact — your notes are applied to this regen only.
          </DialogDescription>
        </DialogHeader>

        {panel && (
          <EditPanelForm
            key={panel.index}
            panel={panel}
            submitting={submitting}
            onRegenerate={onRegenerate}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface EditPanelFormProps {
  panel: EditPanelTarget;
  submitting?: boolean;
  onRegenerate: (panelIndex: number, feedback: string) => void | Promise<void>;
  onCancel: () => void;
}

/**
 * Inner form: feedback textarea + actions, scoped to one panel. Remounted by
 * the parent (via `key={panel.index}`) so feedback state resets naturally
 * when the user switches panels — no effect needed.
 */
function EditPanelForm({
  panel,
  submitting,
  onRegenerate,
  onCancel,
}: EditPanelFormProps) {
  const [feedback, setFeedback] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onRegenerate(panel.index, feedback.trim());
    onCancel();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PanelPreview imageUrl={panel.imageUrl} index={panel.index} />
      {panel.prompt && <PanelPromptDisplay prompt={panel.prompt} />}
      <FeedbackField value={feedback} onChange={setFeedback} />
      <DialogFooter className="gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={submitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={submitting}
          className="bg-indigo-600 hover:bg-indigo-500 text-white inline-flex items-center gap-1.5"
        >
          <RefreshCw
            className={`h-4 w-4 ${submitting ? 'animate-spin' : ''}`}
          />
          {submitting ? 'Regenerating…' : 'Regenerate with feedback'}
        </Button>
      </DialogFooter>
    </form>
  );
}

function PanelPreview({
  imageUrl,
  index,
}: {
  imageUrl?: string | null;
  index: number;
}) {
  return (
    <div className="aspect-video relative rounded-lg border border-slate-800 bg-black flex items-center justify-center overflow-hidden">
      {imageUrl ? (
        <ImageWithFallback
          src={imageUrl}
          alt={`Panel ${index + 1}`}
          className="object-cover w-full h-full"
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-slate-500 text-sm space-y-2">
          <ImageIcon className="h-8 w-8 text-slate-600" />
          <span>No image rendered</span>
        </div>
      )}
    </div>
  );
}

function PanelPromptDisplay({ prompt }: { prompt: string }) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
        Original Panel Prompt
      </span>
      <p className="text-sm text-slate-200 bg-slate-950/60 border border-slate-800 rounded-lg p-3 italic">
        &ldquo;{prompt}&rdquo;
      </p>
    </div>
  );
}

function FeedbackField({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor="edit-panel-feedback"
        className="text-xs font-bold text-slate-400 uppercase tracking-wider block"
      >
        Additional Feedback
      </label>
      <Textarea
        id="edit-panel-feedback"
        placeholder="What should change? (e.g. 'Change the detective's coat to red and add rain effects')"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-24 text-xs resize-none"
      />
    </div>
  );
}
