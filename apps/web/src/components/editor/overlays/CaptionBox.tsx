'use client';

import React, { useRef, useCallback } from 'react';
import { motion, type PanInfo } from 'framer-motion';
import type { NormalizedPoint } from '@panelcraft/types';

/**
 * Caption-specific variant (kept narrow for now; future expansions e.g. "narration", "sign").
 */
export type CaptionVariant = 'caption';

/**
 * Props for CaptionBox — narration / caption overlays.
 * Follows the exact same constraints as SpeechBubble:
 * - Normalized 0-1 coords only.
 * - Must live inside pageRef subtree.
 * - framer-motion drag only.
 * - Thin presentational layer.
 */
export interface CaptionBoxProps {
  text?: string;
  children?: React.ReactNode;

  /** Normalized position (anchor point, typically biased toward top or bottom of panel). */
  position: NormalizedPoint;

  variant?: CaptionVariant;

  /** Drag enabled only in editor surfaces. */
  draggable?: boolean;

  onPositionChange?: (newPosition: NormalizedPoint) => void;

  /** Request edit (double-click or button). */
  onEditRequest?: () => void;

  className?: string;

  /** Container for accurate normalized drag conversion (same as SpeechBubble). */
  containerRef?: React.RefObject<HTMLElement>;
}

/**
 * Classic comic caption / narration box styling.
 * Yellowed paper or stark black/white high-contrast options for versatility.
 */
function getCaptionStyles() {
  return 'select-none border-2 border-black bg-[#f4e9c8] px-3 py-2 text-center text-black shadow-[2px_2px_0_#000] font-medium italic tracking-[0.015em]';
}

/**
 * CaptionBox
 *
 * Draggable or static caption/narration box for comic lettering.
 * Positioned via normalized coordinates. No tail (traditional captions are
 * self-contained rectangles, often at panel top or bottom).
 *
 * @example
 * <CaptionBox
 *   text="MEANWHILE, ACROSS TOWN..."
 *   position={{ x: 0.5, y: 0.08 }}
 *   draggable={editing}
 *   onPositionChange={updateCaption}
 *   containerRef={panelRef}
 * />
 */
export function CaptionBox({
  text,
  children,
  position,
  variant = 'caption', // eslint-disable-line @typescript-eslint/no-unused-vars -- variant reserved for future styling variants (paper, boxed, open)
  draggable = false,
  onPositionChange,
  onEditRequest,
  className = '',
  containerRef,
}: CaptionBoxProps) {
  const boxRef = useRef<HTMLDivElement>(null);

  const content = children ?? text ?? '';

  const style: React.CSSProperties = {
    position: 'absolute',
    left: `${position.x * 100}%`,
    top: `${position.y * 100}%`,
    transform: 'translate(-50%, 0)', // captions often "hang" from their top anchor
    zIndex: 25,
    maxWidth: '85%',
    minWidth: '28%',
    pointerEvents: draggable ? 'auto' : 'none',
  };

  const captionClasses = getCaptionStyles();

  const handleDragEnd = useCallback(
    (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (!onPositionChange) return;

      const containerEl = containerRef?.current ?? boxRef.current?.offsetParent as HTMLElement | null;
      if (!containerEl) {
        console.warn('[CaptionBox] Missing containerRef for normalization.');
        return;
      }

      const rect = containerEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const finalX = info.point.x;
      const finalY = info.point.y;

      const newNormX = (finalX - rect.left) / rect.width;
      const newNormY = (finalY - rect.top) / rect.height;

      onPositionChange({
        x: Math.max(0.02, Math.min(0.98, newNormX)),
        y: Math.max(0.02, Math.min(0.98, newNormY)),
      });
    },
    [onPositionChange, containerRef]
  );

  const boxContent = (
    <div
      ref={boxRef}
      className={`
        ${captionClasses}
        ${className}
        text-[10px] leading-snug sm:text-xs
        cursor-${draggable ? 'grab active:cursor-grabbing' : 'default'}
      `}
      onDoubleClick={draggable && onEditRequest ? onEditRequest : undefined}
    >
      {content}

      {draggable && onEditRequest && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEditRequest();
          }}
          className="absolute -right-1 -top-1 rounded-full bg-amber-700 px-1 text-[8px] text-white shadow ring-1 ring-white/70"
          aria-label="Edit caption"
        >
          ✎
        </button>
      )}
    </div>
  );

  if (draggable) {
    return (
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <motion.div
          drag
          dragMomentum={false}
          dragElastic={0.04}
          onDragEnd={handleDragEnd}
          style={style}
          className="touch-none"
          whileDrag={{ scale: 1.02, zIndex: 35 }}
        >
          {boxContent}
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div style={style} className="caption-box-static">
        {boxContent}
      </div>
    </div>
  );
}
