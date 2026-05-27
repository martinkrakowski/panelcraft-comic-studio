'use client';

import { WizardSidebar } from '@panelcraft/ui';
import { LayoutChooserSection } from './sidebar/LayoutChooserSection';
import { RecommendedLayoutsSection } from './sidebar/RecommendedLayoutsSection';
import { WorkflowProgressSection } from './sidebar/WorkflowProgressSection';
import { CoverSection } from './sidebar/CoverSection';
import { StoryPromptSection } from './sidebar/StoryPromptSection';
import { GenresAndTonesSection } from './sidebar/GenresAndTonesSection';
import {
  CharacterBibleSection,
  type SidebarCharacterBible,
} from './sidebar/CharacterBibleSection';
import {
  StyleSection,
  type SidebarStyleReferences,
} from './sidebar/StyleSection';
import type { PanelDTO, ProjectStatus } from '@panelcraft/types';

interface EditorSidebarProps {
  // Workflow status
  completedPanelCount: number;
  panelCount: number;
  progressPercent: number;
  panels: PanelDTO[];
  status?: ProjectStatus;

  // Layout chooser (conditional — only when pending_layout)
  layoutOptions?: string[] | null;
  selectingLayout?: boolean;
  selectedLayout?: string | null;
  onSelectLayout?: (layout: string) => void;

  // Persistent Recommended Layouts catalog (shown post-layout-selection)
  swappingLayout?: boolean;
  extendingPanels?: boolean;
  shrinkingPanels?: boolean;
  onSwapLayout?: (layout: string) => void | Promise<void>;
  onExtendPanels?: (
    layout: string,
    targetPanelCount: number
  ) => void | Promise<void>;
  onShrinkPanels?: (
    layout: string,
    keepIndices: number[]
  ) => void | Promise<void>;

  // Wizard-collected reference data for HITL review
  prompt?: string;
  coverImageUrl?: string | null;
  genres?: string[];
  tones?: string[];
  characterBible?: SidebarCharacterBible | null;
  styleReferences?: SidebarStyleReferences | null;
}

/**
 * Sidebar for the project editor / HITL review surface. Acts as a
 * project-summary panel: surfaces everything the user supplied during the
 * wizard (story prompt, genres, tones, characters, style refs, mood board)
 * alongside the runtime workflow state (progress bar, layout chooser).
 *
 * Each section is its own component under `./sidebar/` and self-handles its
 * conditional render — pass everything that's available on the project DTO
 * and the sections decide what to display.
 */
export function EditorSidebar({
  completedPanelCount,
  panelCount,
  progressPercent,
  panels,
  status,
  layoutOptions,
  selectingLayout,
  selectedLayout,
  onSelectLayout,
  swappingLayout,
  extendingPanels,
  shrinkingPanels,
  onSwapLayout,
  onExtendPanels,
  onShrinkPanels,
  prompt,
  coverImageUrl,
  genres,
  tones,
  characterBible,
  styleReferences,
}: EditorSidebarProps) {
  // Any in-flight swap/extend/shrink action blocks the Recommended Layouts
  // tiles to prevent stacking conflicting reconfigurations.
  const swapBusy = !!(swappingLayout || extendingPanels || shrinkingPanels);
  return (
    <WizardSidebar variant="flex" title="Project" className="pt-20">
      <LayoutChooserSection
        layoutOptions={layoutOptions}
        selectingLayout={selectingLayout}
        selectedLayout={selectedLayout}
        onSelectLayout={onSelectLayout}
      />
      <RecommendedLayoutsSection
        panelCount={panelCount}
        panels={panels}
        status={status}
        selectedLayout={selectedLayout}
        swapBusy={swapBusy}
        onSwapLayout={onSwapLayout}
        onExtendPanels={onExtendPanels}
        onShrinkPanels={onShrinkPanels}
      />
      <WorkflowProgressSection
        completedPanelCount={completedPanelCount}
        panelCount={panelCount}
        progressPercent={progressPercent}
      />
      <CoverSection coverImageUrl={coverImageUrl} />
      <StoryPromptSection prompt={prompt} />
      <GenresAndTonesSection genres={genres} tones={tones} />
      <CharacterBibleSection characterBible={characterBible} />
      <StyleSection styleReferences={styleReferences} />
    </WizardSidebar>
  );
}
