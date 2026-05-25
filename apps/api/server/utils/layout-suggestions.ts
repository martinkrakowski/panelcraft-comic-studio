/**
 * Layout suggestion engine for Step 5 (Layout Chooser)
 * Selects 4-6 intelligent layout variants based on panel count
 */

interface LayoutSuggestion {
  id: string;
  name: string;
  description: string;
  mood: string;
  priority: number; // 1-6, used for ordering suggestions
}

// Map of panel counts to suggested layout IDs and priorities
const LAYOUT_SUGGESTIONS: Record<number, LayoutSuggestion[]> = {
  1: [
    {
      id: 'splash-full',
      name: 'Full Page Splash',
      description: 'Dramatic establishing shot or emotional peak moment',
      mood: 'dramatic',
      priority: 1,
    },
  ],
  2: [
    {
      id: 'asymmetric-large-inset',
      name: 'Dominant + Inset',
      description: 'Large dominant panel with small reactive detail',
      mood: 'dynamic',
      priority: 1,
    },
    {
      id: 'vertical-split',
      name: 'Vertical Split',
      description: 'Two equal columns for side-by-side comparison',
      mood: 'balanced',
      priority: 2,
    },
    {
      id: 'horizontal-split',
      name: 'Horizontal Split',
      description: 'Top and bottom panels for narrative flow',
      mood: 'balanced',
      priority: 3,
    },
    {
      id: 'l-shaped',
      name: 'L-Shaped',
      description: 'Large panel with smaller supporting panel',
      mood: 'dynamic',
      priority: 4,
    },
  ],
  3: [
    {
      id: 'classic-flow',
      name: 'Classic Flow',
      description: 'Small setup → medium action → large impact bottom panel',
      mood: 'balanced',
      priority: 1,
    },
    {
      id: 'establishing-duo',
      name: 'Establishing + Duo',
      description: 'Large shot on top, two reaction panels below',
      mood: 'balanced',
      priority: 2,
    },
    {
      id: 'dominant-insets',
      name: 'Dominant + Dual Insets',
      description: 'Large central focus with two reaction panels',
      mood: 'dramatic',
      priority: 3,
    },
    {
      id: 'vertical-stack-varied',
      name: 'Stacked Varied Heights',
      description: 'Three panels stacked vertically with varied heights',
      mood: 'dynamic',
      priority: 4,
    },
    {
      id: 'diagonal-dynamic',
      name: 'Diagonal Dynamic',
      description: 'Large diagonal panel with two smaller panels',
      mood: 'dynamic',
      priority: 5,
    },
  ],
  4: [
    {
      id: 'grid-2x2-variable',
      name: '2x2 Grid Variable',
      description: '2x2 grid with variable sizes for visual interest',
      mood: 'balanced',
      priority: 1,
    },
    {
      id: 'dominant-supporting',
      name: 'Dominant + Three Supporting',
      description: 'One large panel (60%) with three smaller panels',
      mood: 'dramatic',
      priority: 2,
    },
    {
      id: 'three-top-one-bottom',
      name: 'Triple Top + Cinematic',
      description: 'Three smaller panels on top, one large below',
      mood: 'dynamic',
      priority: 3,
    },
    {
      id: 'horizontal-tiers',
      name: 'Horizontal Tiers',
      description: 'Full-width top panel with three varying panels below',
      mood: 'balanced',
      priority: 4,
    },
    {
      id: 'staggered-action',
      name: 'Staggered Action',
      description: 'Stair-step layout for fast-paced action sequences',
      mood: 'dynamic',
      priority: 5,
    },
  ],
};

/**
 * Get layout suggestions for a given panel count
 * Returns 4-6 curated layout variants, ordered by priority
 */
export function getSuggestedLayouts(panelCount: number): LayoutSuggestion[] {
  const suggestions = LAYOUT_SUGGESTIONS[panelCount] || [];
  return suggestions.sort((a, b) => a.priority - b.priority);
}

/**
 * Format layout suggestions for API response
 */
export function formatLayoutSuggestions(panelCount: number): Array<{
  id: string;
  name: string;
  description: string;
  mood: string;
}> {
  return getSuggestedLayouts(panelCount).map((layout) => ({
    id: layout.id,
    name: layout.name,
    description: layout.description,
    mood: layout.mood,
  }));
}
