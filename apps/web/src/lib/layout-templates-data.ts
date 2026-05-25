// Raw layout template data — no type imports needed (inferred by TypeScript)

// 1-PANEL LAYOUTS
export const LAYOUTS_1_PANEL = [
  {
    id: 'splash-full',
    name: 'Full Page Splash',
    description: 'Dramatic establishing shot or emotional peak moment',
    panelCount: 1 as const,
    mood: 'dramatic' as const,
    panels: [{ x: 0, y: 0, width: 4, height: 4 }],
    gridTemplate: '1fr',
  },
];

// 2-PANEL LAYOUTS
export const LAYOUTS_2_PANELS = [
  {
    id: 'vertical-split',
    name: 'Vertical Split',
    description:
      'Two equal columns for side-by-side comparison or action vs reaction',
    panelCount: 2 as const,
    mood: 'balanced' as const,
    panels: [
      { x: 0, y: 0, width: 2, height: 4 },
      { x: 2, y: 0, width: 2, height: 4 },
    ],
    gridTemplate: '1fr 1fr / 1fr 1fr',
  },
  {
    id: 'horizontal-split',
    name: 'Horizontal Split',
    description: 'Top and bottom panels for narrative flow or cause and effect',
    panelCount: 2 as const,
    mood: 'balanced' as const,
    panels: [
      { x: 0, y: 0, width: 4, height: 2 },
      { x: 0, y: 2, width: 4, height: 2 },
    ],
    gridTemplate: '1fr 1fr / 1fr',
  },
  {
    id: 'asymmetric-large-inset',
    name: 'Dominant + Inset',
    description:
      'Large dominant panel with small reactive detail panel tucked in corner',
    panelCount: 2 as const,
    mood: 'dynamic' as const,
    panels: [
      { x: 0, y: 0, width: 3, height: 4 },
      { x: 3, y: 2, width: 1, height: 2 },
    ],
    gridTemplate: '1fr 1fr / 1fr 1fr',
  },
  {
    id: 'l-shaped',
    name: 'L-Shaped',
    description: 'Large panel with smaller supporting panel in corner',
    panelCount: 2 as const,
    mood: 'dynamic' as const,
    panels: [
      { x: 0, y: 0, width: 4, height: 3 },
      { x: 2, y: 3, width: 2, height: 1 },
    ],
    gridTemplate: '3fr 1fr / 1fr 1fr',
  },
];

// 3-PANEL LAYOUTS
export const LAYOUTS_3_PANELS = [
  {
    id: 'classic-flow',
    name: 'Classic Flow',
    description:
      'Small setup (top-left) → medium action (top-right) → large impact (bottom)',
    panelCount: 3 as const,
    mood: 'balanced' as const,
    panels: [
      { x: 0, y: 0, width: 2, height: 2 },
      { x: 2, y: 0, width: 2, height: 2 },
      { x: 0, y: 2, width: 4, height: 2 },
    ],
    gridTemplate: '1fr 1fr / 1fr 1fr',
  },
  {
    id: 'establishing-duo',
    name: 'Establishing + Duo',
    description:
      'Large establishing shot on top, two reaction panels side-by-side below',
    panelCount: 3 as const,
    mood: 'balanced' as const,
    panels: [
      { x: 0, y: 0, width: 4, height: 2 },
      { x: 0, y: 2, width: 2, height: 2 },
      { x: 2, y: 2, width: 2, height: 2 },
    ],
    gridTemplate: '1fr 1fr / 1fr 1fr',
  },
  {
    id: 'vertical-stack-varied',
    name: 'Stacked Varied Heights',
    description:
      'Three panels stacked vertically with varying heights for rhythm',
    panelCount: 3 as const,
    mood: 'dynamic' as const,
    panels: [
      { x: 0, y: 0, width: 4, height: 1 },
      { x: 0, y: 1, width: 4, height: 2 },
      { x: 0, y: 3, width: 4, height: 1 },
    ],
    gridTemplate: '1fr 2fr 1fr / 1fr',
  },
  {
    id: 'diagonal-dynamic',
    name: 'Diagonal Dynamic',
    description:
      'Large diagonal panel with two smaller panels creating dynamic flow',
    panelCount: 3 as const,
    mood: 'dynamic' as const,
    panels: [
      { x: 0, y: 0, width: 3, height: 2 },
      { x: 3, y: 0, width: 1, height: 2 },
      { x: 1, y: 2, width: 3, height: 2 },
    ],
    gridTemplate: '1fr 1fr / 1fr 1fr',
  },
  {
    id: 'dominant-insets',
    name: 'Dominant + Dual Insets',
    description: 'Large central focus with two smaller reaction/detail panels',
    panelCount: 3 as const,
    mood: 'intimate' as const,
    panels: [
      { x: 0, y: 0, width: 3, height: 4 },
      { x: 3, y: 0, width: 1, height: 2 },
      { x: 3, y: 2, width: 1, height: 2 },
    ],
    gridTemplate: '1fr 1fr / 1fr 1fr',
  },
];

// 4-PANEL LAYOUTS
export const LAYOUTS_4_PANELS = [
  {
    id: 'grid-2x2-variable',
    name: '2x2 Grid Variable',
    description: '2x2 grid with variable sizes for visual interest and pacing',
    panelCount: 4 as const,
    mood: 'balanced' as const,
    panels: [
      { x: 0, y: 0, width: 2, height: 2 },
      { x: 2, y: 0, width: 2, height: 2 },
      { x: 0, y: 2, width: 2, height: 2 },
      { x: 2, y: 2, width: 2, height: 2 },
    ],
    gridTemplate: '1fr 1fr / 1fr 1fr',
  },
  {
    id: 'three-top-one-bottom',
    name: 'Triple Top + Cinematic',
    description:
      'Three smaller panels on top, one large cinematic panel below for impact',
    panelCount: 4 as const,
    mood: 'dynamic' as const,
    panels: [
      { x: 0, y: 0, width: 1.33, height: 1.5 },
      { x: 1.33, y: 0, width: 1.33, height: 1.5 },
      { x: 2.66, y: 0, width: 1.34, height: 1.5 },
      { x: 0, y: 1.5, width: 4, height: 2.5 },
    ],
    gridTemplate: '1fr 2fr / 1fr 1fr 1fr',
  },
  {
    id: 'dominant-supporting',
    name: 'Dominant + Three Supporting',
    description:
      'One large panel (60%) taking focus with three smaller supporting panels',
    panelCount: 4 as const,
    mood: 'dramatic' as const,
    panels: [
      { x: 0, y: 0, width: 3, height: 3 },
      { x: 3, y: 0, width: 1, height: 1.5 },
      { x: 3, y: 1.5, width: 1, height: 1.5 },
      { x: 0, y: 3, width: 4, height: 1 },
    ],
    gridTemplate: '1fr 1fr 1fr / 1fr 1fr 1fr 1fr',
  },
  {
    id: 'staggered-action',
    name: 'Staggered Action',
    description:
      'Stair-step layout for fast-paced action sequences with visual momentum',
    panelCount: 4 as const,
    mood: 'dynamic' as const,
    panels: [
      { x: 0, y: 0, width: 2, height: 1.5 },
      { x: 2, y: 0.75, width: 2, height: 1.5 },
      { x: 0, y: 2.25, width: 2, height: 1.5 },
      { x: 2, y: 3, width: 2, height: 1 },
    ],
    gridTemplate: '1fr 1fr / 1fr 1fr',
  },
  {
    id: 'horizontal-tiers',
    name: 'Horizontal Tiers',
    description:
      'Full-width top panel with three varying panels below for rhythm',
    panelCount: 4 as const,
    mood: 'balanced' as const,
    panels: [
      { x: 0, y: 0, width: 4, height: 1.5 },
      { x: 0, y: 1.5, width: 1.5, height: 2.5 },
      { x: 1.5, y: 1.5, width: 1, height: 2.5 },
      { x: 2.5, y: 1.5, width: 1.5, height: 2.5 },
    ],
    gridTemplate: '1fr 1fr 1fr / 1fr 1fr 1fr 1fr',
  },
];

export const ALL_LAYOUTS = {
  1: LAYOUTS_1_PANEL,
  2: LAYOUTS_2_PANELS,
  3: LAYOUTS_3_PANELS,
  4: LAYOUTS_4_PANELS,
} as const;
