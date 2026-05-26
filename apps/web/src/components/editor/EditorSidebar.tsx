'use client';

import { WizardSidebar } from '@panelcraft/ui';
import { LayoutChooserSection } from './sidebar/LayoutChooserSection';
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

interface EditorSidebarProps {
  // Workflow status
  completedPanelCount: number;
  panelCount: number;
  progressPercent: number;

  // Layout chooser (conditional — only when pending_layout)
  layoutOptions?: string[] | null;
  selectingLayout?: boolean;
  selectedLayout?: string | null;
  onSelectLayout?: (layout: string) => void;

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
  layoutOptions,
  selectingLayout,
  selectedLayout,
  onSelectLayout,
  prompt,
  coverImageUrl,
  genres,
  tones,
  characterBible,
  styleReferences,
}: EditorSidebarProps) {
  return (
    <WizardSidebar variant="flex" title="Project" className="pt-20">
      <LayoutChooserSection
        layoutOptions={layoutOptions}
        selectingLayout={selectingLayout}
        selectedLayout={selectedLayout}
        onSelectLayout={onSelectLayout}
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
