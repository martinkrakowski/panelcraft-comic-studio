'use client';

import React, { useRef, useCallback } from 'react';
import { motion, type PanInfo } from 'framer-motion';

// Use centralized types from the shared kernel (via @panelcraft/types re-export).
import type { NormalizedPoint } from '@panelcraft/types';

/**
 * Supported visual variants for speech/thought/shout bubbles.
 * Caption variant is handled by the sibling CaptionBox component.
 */
export type SpeechVariant = 'speech' | 'thought' | 'shout';

/**
 * Props for the SpeechBubble overlay component.
 *
 * IMPORTANT CONSTRAINTS (from approved design):
 * - position and tailTarget are ALWAYS normalized 0-1.
 * - Component MUST be rendered as a descendant of the html-to-image pageRef subtree
 *   (typically inside a relative-positioned panel cell in ComposedPage).
 * - Drag behavior provided exclusively via framer-motion.
 * - This is a thin presentational component. All persistence, validation, and
 *   business logic (e.g. linking speaker to CharacterBible) belongs in domain/application layers.
 */
export interface SpeechBubbleProps {
  /** The spoken/thought/shouted text. Prefer this or children for flexibility. */
  text?: string;
  children?: React.ReactNode;

  /** Normalized anchor position of the bubble body (e.g. center of the lettering box). */
  position: NormalizedPoint;

  /**
   * Optional normalized point the bubble's tail should point toward
   * (typically a speaker's mouth or focal character in the panel art).
   * When omitted, no tail is rendered.
   */
  tailTarget?: NormalizedPoint;

  /** Visual style variant. Defaults to 'speech'. */
  variant?: SpeechVariant;

  /**
   * When true (editor mode), the bubble is draggable via framer-motion.
   * When false (view/export mode), renders as a static positioned element.
   * Critical for html-to-image safety and preventing accidental drags in the published comic.
   */
  draggable?: boolean;

  /** Optional speaker label shown above or as title (free-text initially). */
  speaker?: string;

  /** Called after a successful drag gesture with the new normalized position. */
  onPositionChange?: (newPosition: NormalizedPoint) => void;

  /**
   * Called after dragging the tail tip (if separate tail drag is enabled in future).
   * For v1, tailTarget changes are typically driven by the parent re-computing from
   * speaker position or manual edit.
   */
  onTailTargetChange?: (newTarget: NormalizedPoint) => void;

  /** Optional callback when user requests to edit the text (e.g. double-click or button). */
  onEditRequest?: () => void;

  /** Additional classes for the root positioned element. */
  className?: string;

  /**
   * Reference to the relative container (panel cell) used for normalized <-> px conversion
   * during drag. Strongly recommended for accurate math. Falls back to viewport heuristics
   * only when absent (not ideal for export containers).
   */
  containerRef?: React.RefObject<HTMLElement>;
}

/**
 * Computes a reasonable attachment point on the "bubble" perimeter given
 * the bubble's normalized position (treated as center for calculation) and
 * the tail target. Returns a normalized point near the bubble edge in the
 * direction of the tail.
 *
 * This is a pure function to enable easy testing and reuse (e.g. in CaptionBox
 * or future overlay editors). Initial implementation uses simple directional
 * approximation; can be upgraded to full geometry projection later.
 *
 * @param bubbleCenter - approx center of bubble in normalized coords
 * @param target - the point the tail aims at
 * @returns normalized point on/near bubble edge for tail base
 */
export function computeTailAttachment(
  bubbleCenter: NormalizedPoint,
  target: NormalizedPoint
): NormalizedPoint {
  if (!target) return bubbleCenter;

  const dx = target.x - bubbleCenter.x;
  const dy = target.y - bubbleCenter.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;

  // Approximate "radius" of the bubble in normalized space (tuned for visual balance).
  // These are small because bubbles are compact relative to full panel.
  const radiusX = 0.12;
  const radiusY = 0.08;

  // Normalize direction and scale to ellipse-ish perimeter
  const nx = dx / dist;
  const ny = dy / dist;

  // Simple elliptical offset from center toward the target
  const attachX = bubbleCenter.x + nx * radiusX;
  const attachY = bubbleCenter.y + ny * radiusY;

  // Clamp to [0,1] to avoid tails escaping the panel
  return {
    x: Math.max(0, Math.min(1, attachX)),
    y: Math.max(0, Math.min(1, attachY)),
  };
}

/**
 * Returns Tailwind + inline style classes for a given speech variant.
 * Keeps visual definition co-located and easy to evolve toward comic-authentic
 * hand-lettered aesthetics without introducing new dependencies.
 */
function getVariantStyles(variant: SpeechVariant) {
  const base =
    'select-none rounded-2xl border-2 border-black bg-white px-3 py-1.5 text-center shadow-[2px_2px_0_#000]';

  switch (variant) {
    case 'thought':
      return `${base} rounded-[50%] border-dashed bg-slate-50 text-slate-900`;
    case 'shout':
      return `${base} border-red-600 bg-yellow-200 text-red-900 font-black uppercase tracking-[0.04em] shadow-[3px_3px_0_#000]`;
    case 'speech':
    default:
      return `${base} bg-white text-black`;
  }
}

/**
 * SpeechBubble
 *
 * A draggable (editor) or static (view/export) comic speech/thought/shout bubble.
 * Renders text with appropriate comic styling and an optional directional tail.
 *
 * All positioning is normalized. The component expects to live inside a
 * `position: relative` ancestor that represents the panel bounds (this ancestor
 * should itself be inside the pageRef subtree for export fidelity).
 *
 * @example
 * // Inside a panel cell (relative)
 * <SpeechBubble
 *   text="Holy cow!"
 *   position={{ x: 0.7, y: 0.25 }}
 *   tailTarget={{ x: 0.4, y: 0.55 }}
 *   variant="shout"
 *   draggable={isEditing}
 *   onPositionChange={handleUpdate}
 *   containerRef={panelContainerRef}
 * />
 */
export function SpeechBubble({
  text,
  children,
  position,
  tailTarget,
  variant = 'speech',
  draggable = false,
  speaker,
  onPositionChange,
  onTailTargetChange, // eslint-disable-line @typescript-eslint/no-unused-vars -- reserved for future interactive tail dragging handle
  onEditRequest,
  className = '',
  containerRef,
}: SpeechBubbleProps) {
  const bubbleRef = useRef<HTMLDivElement>(null);

  const content = children ?? text ?? '';

  // Convert normalized position to percentage styles (the source of truth for layout)
  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${position.x * 100}%`,
    top: `${position.y * 100}%`,
    transform: 'translate(-50%, -50%)', // center the bubble on the normalized point
    zIndex: 20, // above panel art, below any UI chrome
    maxWidth: '42%',
    minWidth: '18%',
    pointerEvents: draggable ? 'auto' : 'none', // prevent accidental interaction in view mode
  };

  const variantClasses = getVariantStyles(variant);

  /**
   * Handle drag end from framer-motion.
   * Converts the resulting DOM position back into normalized coordinates
   * using the provided containerRef (preferred) or a reasonable fallback.
   */
  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (!onPositionChange) return;

      const containerEl = containerRef?.current ?? bubbleRef.current?.offsetParent as HTMLElement | null;
      if (!containerEl) {
        // Fallback (rare): use the movement delta against assumed viewport
        // This is imprecise and only for emergency graceful degradation.
        console.warn('[SpeechBubble] No containerRef — using imprecise delta fallback for normalization.');
        const deltaNormX = info.offset.x / (window.innerWidth || 800);
        const deltaNormY = info.offset.y / (window.innerHeight || 1000);
        const newX = Math.max(0, Math.min(1, position.x + deltaNormX));
        const newY = Math.max(0, Math.min(1, position.y + deltaNormY));
        onPositionChange({ x: newX, y: newY });
        return;
      }

      const rect = containerEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      // Current visual center after drag (info.point is viewport coords)
      const finalX = info.point.x;
      const finalY = info.point.y;

      // Convert viewport point back to normalized within this container
      const newNormX = (finalX - rect.left) / rect.width;
      const newNormY = (finalY - rect.top) / rect.height;

      const clamped = {
        x: Math.max(0.02, Math.min(0.98, newNormX)),
        y: Math.max(0.02, Math.min(0.98, newNormY)),
      };

      onPositionChange(clamped);
    },
    [onPositionChange, containerRef, position]
  );

  // Tail attachment point (normalized) if tailTarget provided
  const tailAttach = tailTarget
    ? computeTailAttachment(position, tailTarget)
    : null;

  // Simple tail rendering: an absolutely positioned line + tip using a sibling span
  // positioned via % within the same relative parent. This keeps everything in-DOM
  // for html-to-image without extra canvases or portals.
  const renderTail = () => {
    if (!tailTarget || !tailAttach) return null;

    // Compute angle for rotation of a classic comic pointer
    const angleDeg =
      (Math.atan2(
        tailTarget.y - tailAttach.y,
        tailTarget.x - tailAttach.x
      ) *
        180) /
      Math.PI;

    const tailStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${tailAttach.x * 100}%`,
      top: `${tailAttach.y * 100}%`,
      width: 0,
      height: 0,
      // Classic comic pointer triangle via borders
      borderLeft: '6px solid transparent',
      borderRight: '6px solid transparent',
      borderTop: variant === 'shout' ? '10px solid #b45309' : '10px solid #111827',
      transform: `translate(-50%, -50%) rotate(${angleDeg + 90}deg)`,
      zIndex: 15,
      pointerEvents: 'none',
    };

    // For thought bubbles use a dotted "cloud" tail approximation (multiple small dots)
    if (variant === 'thought') {
      return (
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${Math.min(tailAttach.x, tailTarget.x) * 100}%`,
            top: `${Math.min(tailAttach.y, tailTarget.y) * 100}%`,
            width: `${Math.abs(tailTarget.x - tailAttach.x) * 100}%`,
            height: `${Math.abs(tailTarget.y - tailAttach.y) * 100}%`,
            zIndex: 15,
          }}
        >
          {/* Simple dotted tail using pseudo via multiple tiny rounded divs */}
          {[0, 0.25, 0.5, 0.75].map((t, i) => (
            <div
              key={i}
              className="absolute bg-slate-400 rounded-full"
              style={{
                left: `${t * 100}%`,
                top: `${t * 100}%`,
                width: 5,
                height: 5,
                transform: 'translate(-50%, -50%)',
                opacity: 0.7 - i * 0.1,
              }}
            />
          ))}
        </div>
      );
    }

    return <div style={tailStyle} aria-hidden />;
  };

  const bubbleContent = (
    <div
      ref={bubbleRef}
      className={`
        ${variantClasses}
        ${className}
        text-[11px] leading-tight font-medium sm:text-xs
        ${variant === 'shout' ? 'text-sm font-black' : ''}
        cursor-${draggable ? 'grab active:cursor-grabbing' : 'default'}
      `}
      onDoubleClick={draggable && onEditRequest ? onEditRequest : undefined}
      title={speaker ? `${speaker}: ${typeof content === 'string' ? content : ''}` : undefined}
    >
      {speaker && (
        <div className="mb-0.5 text-[9px] font-bold uppercase tracking-[0.08em] text-slate-500/80">
          {speaker}
        </div>
      )}
      <div className="whitespace-pre-wrap break-words">{content}</div>

      {/* Small edit affordance visible only in draggable mode */}
      {draggable && onEditRequest && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEditRequest();
          }}
          className="absolute -right-1.5 -top-1.5 rounded-full bg-indigo-600 px-1 text-[8px] text-white shadow ring-1 ring-white/70"
          aria-label="Edit dialogue"
        >
          ✎
        </button>
      )}
    </div>
  );

  const rootClass = `speech-bubble ${draggable ? 'will-change-transform' : ''}`;

  if (draggable) {
    return (
      <div className={rootClass} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {/* The tail lives in the container coordinate system */}
        {renderTail()}

        <motion.div
          drag
          dragMomentum={false}
          dragElastic={0.05}
          onDragEnd={handleDragEnd}
          style={style}
          className="touch-none"
          whileDrag={{ scale: 1.03, zIndex: 30 }}
          data-variant={variant}
        >
          {bubbleContent}
        </motion.div>
      </div>
    );
  }

  // Static (view + export) mode — no motion, pure DOM for reliable html-to-image capture
  return (
    <div className={rootClass} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      {renderTail()}
      <div style={style} data-variant={variant} className="speech-bubble-static">
        {bubbleContent}
      </div>
    </div>
  );
}
