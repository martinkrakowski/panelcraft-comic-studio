'use client';

import { useRef, useState } from 'react';
import { FeedbackRegenerateDialog } from '@panelcraft/ui';
import { RefreshCw } from 'lucide-react';
import { useEffectOnce } from '../../../lib/hooks/useEffectOnce';

export type CompositionFlavor = 'composite-true' | 'repaint';

interface RegenerateCompositionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Invoked when the user confirms. Feedback is applied to this run only
   * (not persisted on the project); flavor controls how aggressively the
   * model alters approved panels — see `ImageCompositionPort`.
   */
  onRegenerate: (
    regenFeedback: string,
    composeFlavor: CompositionFlavor
  ) => void | Promise<void>;
  /** Disables the action while a compose request is in flight. */
  submitting?: boolean;
  /**
   * `compose` drives the first-time copy ("Compose final page", primary
   * CTA reads "Compose"). `regenerate` drives the post-composition flow
   * ("Regenerate final composition", primary CTA reads "Regenerate").
   * Defaults to `regenerate` for backwards compat with existing call sites.
   */
  mode?: 'compose' | 'regenerate';
}

/**
 * Composition-specific wrapper around the shared `FeedbackRegenerateDialog`.
 *
 * Adds the "Composition style" segmented selector (Verbatim vs Re-paint)
 * via the `additionalFields` slot and forwards the flavor alongside the
 * feedback string to the parent's `onRegenerate` callback. The dialog
 * chrome, feedback textarea, and Cancel/Submit buttons all come from the
 * shared primitive.
 */
export function RegenerateCompositionDialog({
  open,
  onOpenChange,
  onRegenerate,
  submitting,
  mode = 'regenerate',
}: RegenerateCompositionDialogProps) {
  const isCompose = mode === 'compose';
  // Selected flavor lives inside the dialog-only `<FlavorField>` subtree,
  // which mounts and unmounts with the dialog form (the shared primitive
  // keys it on `open`). That gives us a free reset between sessions
  // without a raw useEffect — we just mirror the latest value into this
  // ref so the parent's `onSubmit` can read it at submit time.
  const flavorRef = useRef<CompositionFlavor>('composite-true');

  return (
    <FeedbackRegenerateDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isCompose ? 'Compose final page' : 'Regenerate final composition'}
      description={
        isCompose
          ? 'The AI will compose your approved panels into a single unified comic page. Optionally guide it with notes and pick a composition style.'
          : 'Tell the AI what to change and choose how aggressively it should alter your approved panels. Your notes apply to this run only.'
      }
      feedbackLabel={
        isCompose
          ? 'Optional guidance for this composition'
          : 'Composition feedback'
      }
      feedbackPlaceholder={
        isCompose
          ? "Anything to emphasize? (e.g. 'film-noir lighting', 'tight gutters', leave blank for defaults)"
          : "What should change? (e.g. 'tighten the gutters', 'more contrast on Panel 2')"
      }
      submitLabel={isCompose ? 'Compose page' : 'Regenerate composition'}
      submittingLabel={isCompose ? 'Composing…' : 'Regenerating…'}
      submitIcon={
        <RefreshCw className={`h-4 w-4 ${submitting ? 'animate-spin' : ''}`} />
      }
      submitting={submitting}
      additionalFields={
        <FlavorField flavorRef={flavorRef} disabled={submitting} />
      }
      onSubmit={(feedback) => onRegenerate(feedback, flavorRef.current)}
    />
  );
}

interface FlavorFieldProps {
  flavorRef: { current: CompositionFlavor };
  disabled?: boolean;
}

/**
 * Segmented selector for the composition flavor. Owns its own selected
 * state internally (with a `'composite-true'` initial value) so the
 * dialog naturally resets every time it reopens — this component is
 * mounted inside the shared dialog's form subtree, which the primitive
 * keys on `open`. Writes the current selection into the parent's
 * `flavorRef` whenever it changes so the parent's `onSubmit` can read
 * it without needing to subscribe to re-renders.
 *
 * Implemented as a pair of `<button role="radio">` instead of a native
 * radio group because we want a card-style, description-rich layout and
 * the buttons themselves are the click targets (no nested radio inputs
 * to keep accessible).
 */
function FlavorField({ flavorRef, disabled }: FlavorFieldProps) {
  // Always start fresh on mount: the dialog form remounts this subtree on
  // every open via the shared primitive's `key={String(open)}`, so a
  // fresh `useState` call naturally resets the selection. We then mirror
  // the initial value into the parent's ref (once per mount) so the
  // consumer's `onSubmit` sees the same value the user is looking at —
  // the ref otherwise still holds whatever the previous session wrote.
  const [value, setValueState] = useState<CompositionFlavor>('composite-true');
  useEffectOnce(() => {
    flavorRef.current = 'composite-true';
  });
  const onChange = (next: CompositionFlavor) => {
    flavorRef.current = next;
    setValueState(next);
  };
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
        Composition style
      </span>
      <div
        role="radiogroup"
        aria-label="Composition style"
        className="grid grid-cols-2 gap-2"
      >
        <FlavorOption
          selected={value === 'composite-true'}
          disabled={disabled}
          onClick={() => onChange('composite-true')}
          title="Verbatim layout"
          description="Preserve approved panels. Harmonize only gutters, borders, and lighting at the seams."
        />
        <FlavorOption
          selected={value === 'repaint'}
          disabled={disabled}
          onClick={() => onChange('repaint')}
          title="Re-paint for unity"
          description="Treat panels as references and repaint the page for maximum cohesion. Details may shift."
        />
      </div>
    </div>
  );
}

interface FlavorOptionProps {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  description: string;
}

function FlavorOption({
  selected,
  disabled,
  onClick,
  title,
  description,
}: FlavorOptionProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={onClick}
      className={`text-left rounded-lg border px-3 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        selected
          ? 'border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500'
          : 'border-slate-700 bg-slate-900 hover:border-slate-600'
      }`}
    >
      <div className="text-sm font-semibold text-slate-100">{title}</div>
      <div className="mt-1 text-[11px] leading-snug text-slate-400">
        {description}
      </div>
    </button>
  );
}
