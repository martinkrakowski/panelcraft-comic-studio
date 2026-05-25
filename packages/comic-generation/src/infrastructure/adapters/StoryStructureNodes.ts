import {
  LLMResponseParsingError,
  LLMResponseValidationError,
  ExternalServiceError,
} from '@panelcraft/shared';
import type { ComicGraphStateType } from '../types/ComicGraphState.js';
import { PanelPromptValidationService } from '../../domain/services/PanelPromptValidationService.js';
import { CharacterBibleValidationService } from '../../application/services/CharacterBibleValidationService.js';
import type { PanelJSON } from '@panelcraft/comic-project-management';
import type { WorkflowDeps, CharacterBibleData } from './ComicWorkflowTypes.js';

export async function structureStory(
  state: ComicGraphStateType,
  deps: WorkflowDeps
): Promise<ComicGraphStateType> {
  const { prompt, panelCount } = state.project;

  // Skip on re-runs (resume path): if every panel already has a prompt set,
  // structureStory has run before. Re-running would regenerate prompts and
  // wipe previously-approved panels.
  const existingPanels = state.project.panels || [];
  const allHavePrompts =
    existingPanels.length === panelCount &&
    existingPanels.every(
      (p) => typeof p.prompt === 'string' && p.prompt.length > 0
    );
  if (allHavePrompts) {
    deps.logger.info(
      `Skipping structureStory: all ${panelCount} panel prompts already set`
    );
    return state;
  }

  deps.logger.info(`Structuring story into ${panelCount} panels...`);

  const systemPrompt = `You are an expert comic book writer and storyboarder. Your task is to
take a story concept and break it into visually compelling panel descriptions that an AI can use to generate artwork.`;

  const userPrompt = `Story Concept: "${prompt}"
Desired Panel Count: ${panelCount}

Create exactly ${panelCount} short, vivid visual descriptions for each panel of the comic.
Each description should be 1-2 sentences, focusing on visual elements, composition, characters, and mood.
Make them cinematic and action-oriented where appropriate.

Return ONLY a valid JSON array of exactly ${panelCount} strings with no markdown or extra formatting:
["Panel 1: ...", "Panel 2: ...", ...]`;

  let panelPrompts: unknown;
  try {
    panelPrompts = await deps.llmClient.call(systemPrompt, userPrompt);
  } catch (error) {
    if (
      error instanceof LLMResponseParsingError ||
      error instanceof LLMResponseValidationError ||
      error instanceof ExternalServiceError
    ) {
      throw error;
    }
    throw new LLMResponseParsingError(
      `structureStory failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  try {
    PanelPromptValidationService.validate(panelPrompts, panelCount);
  } catch (error) {
    if (error instanceof LLMResponseValidationError) {
      throw new LLMResponseValidationError(
        `structureStory: ${error.message}`,
        error.expected,
        error.received
      );
    }
    throw error;
  }

  // Panels may not exist when loading from a repository that doesn't persist
  // them (e.g. SupabaseProjectRepository). Synthesize the panel array from
  // panelCount in that case so subsequent nodes have something to operate on.
  const promptStrings = panelPrompts as string[];
  const updatedPanels: PanelJSON[] = Array.from(
    { length: panelCount },
    (_, idx) => {
      const existing = existingPanels[idx];
      return {
        id: existing?.id ?? `panel-${idx}`,
        prompt: promptStrings[idx],
        status: existing?.status ?? 'pending',
        generatedImageUrl: existing?.generatedImageUrl ?? null,
      };
    }
  );

  return { ...state, project: { ...state.project, panels: updatedPanels } };
}

export async function buildCharacterBible(
  state: ComicGraphStateType,
  deps: WorkflowDeps
): Promise<ComicGraphStateType> {
  if (state.project.characterBible) {
    deps.logger.info(
      'Skipping buildCharacterBible: character bible pre-seeded'
    );
    return state;
  }

  const { prompt, panels } = state.project;
  const panelPrompts = (panels || [])
    .map((p: unknown) => {
      const panel = p as { prompt?: string };
      return panel.prompt || '';
    })
    .join('\n');

  deps.logger.info('Extracting and characterizing story characters...');

  const systemPrompt = `You are a character designer and visual continuity expert for comic books.
Your task is to extract all significant characters from a story, describe them visually, and provide
consistency notes to ensure they look the same across all panels.`;

  const userPrompt = `Original Story: "${prompt}"

Panel Descriptions:
${panelPrompts}

Analyze the story and panel descriptions to identify all main and supporting characters.
For each character, provide:
- Name (or "Unknown" if not named)
- Role in story
- Visual description (appearance, costume, hair, distinctive features)
- Key personality traits
- Consistency notes (what visual elements MUST stay the same across panels)

Return ONLY valid JSON with no markdown or additional text:
{
  "characters": [
    {
      "name": "...",
      "role": "...",
      "visual": "...",
      "traits": "...",
      "consistency": "..."
    }
  ]
}`;

  let characterData: unknown;
  try {
    characterData = await deps.llmClient.call(systemPrompt, userPrompt);
  } catch (error) {
    if (
      error instanceof LLMResponseParsingError ||
      error instanceof LLMResponseValidationError ||
      error instanceof ExternalServiceError
    ) {
      throw error;
    }
    throw new LLMResponseParsingError(
      `buildCharacterBible failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  CharacterBibleValidationService.validate(characterData);

  deps.logger.debug('[buildCharacterBible Output]', { characterData });

  return {
    ...state,
    project: {
      ...state.project,
      characterBible: characterData as CharacterBibleData,
    },
  };
}
