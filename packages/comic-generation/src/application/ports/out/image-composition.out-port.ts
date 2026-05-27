import type { LayoutTemplate } from '@panelcraft/types';

/**
 * Composition flavor controls how aggressively the model is allowed to
 * alter approved panels:
 *
 *  - `composite-true` (default): the model harmonizes lighting, gutters,
 *    borders and page styling but is instructed to preserve each panel's
 *    subjects and composition. Diffusion models cannot place images
 *    pixel-for-pixel; this minimizes drift.
 *  - `repaint`: the model treats panels as style/content references and
 *    repaints the page from scratch for maximum cohesion. Approved details
 *    can shift.
 */
export type CompositionFlavor = 'composite-true' | 'repaint';

export interface ComposeFinalPageOptions {
  /** Layout geometry the composition must honor as a hard constraint. */
  layoutTemplate: LayoutTemplate;
  /** Approved panel images, in panel-index order. */
  panelImages: Buffer[];
  /** Composition instruction (assembled by the worker from panel rects). */
  prompt: string;
  /** Original story prompt — narrative anchor for tone / setting. */
  storyPrompt: string;
  /** Character bible JSON used during panel generation. */
  characterBible?: unknown;
  /**
   * Reviewer feedback to apply on this run only. The worker injects it
   * into the prompt for regenerations and does not persist it.
   */
  regenFeedback?: string;
  /** See `CompositionFlavor`. Defaults to `composite-true`. */
  composeFlavor?: CompositionFlavor;
}

/**
 * Port for AI-rendered final-page composition.
 *
 * Kept separate from `ImageGenerationPort` because the implementation
 * lives on a different provider (multi-image-input capable, e.g. Gemini
 * 2.5 Flash Image / Imagen / Firefly) than per-panel generation. The
 * decoupling lets us swap composition providers (notably to Adobe Firefly
 * for its native multi-reference composition APIs) without touching the
 * panel-generation pipeline.
 */
export interface ImageCompositionPort {
  /**
   * Compose the approved panel images into a single bitmap of the comic
   * page using the supplied layout as a hard geometric constraint.
   *
   * @returns The composed page as an image buffer (webp/png).
   */
  composeFinalPage(options: ComposeFinalPageOptions): Promise<Buffer>;
}
