/**
 * Classifies a layout-tile click against the project's current panel count
 * so the routing layer can pick the right dialog + endpoint.
 *
 * - `same`   → just rearrange existing panels (PATCH /layout)
 * - `extend` → generate additional panels for a higher-count layout
 * - `shrink` → drop panels to fit a lower-count layout
 */
export type SwapMode = 'same' | 'extend' | 'shrink';

export function classifySwap(
  currentCount: number,
  targetCount: number
): SwapMode {
  if (targetCount === currentCount) return 'same';
  return targetCount > currentCount ? 'extend' : 'shrink';
}

export const PANEL_COUNT_BUCKETS = [1, 2, 3, 4] as const;
