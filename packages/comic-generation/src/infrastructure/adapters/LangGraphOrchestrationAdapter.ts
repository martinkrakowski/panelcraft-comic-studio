import {
  StateGraph,
  START,
  END,
  MemorySaver,
  interrupt,
} from '@langchain/langgraph';
import {
  LLMResponseParsingError,
  LLMResponseValidationError,
  ExternalServiceError,
} from '@panelcraft/shared';
import { ComicProject } from '@panelcraft/comic-project-management';
import {
  ComicGraphState,
  ComicGraphStateType,
} from '../types/ComicGraphState.js';
import type { HITLFeedbackData } from '../../domain/value-objects/HITLFeedback.vo.js';
import type { ImageGenerationPort } from '../../application/ports/out/image-generation.out-port.js';
import type { LLMClientPort } from '../../application/ports/out/llm-client.out-port.js';
import type { RelationalDbPort } from '../../application/ports/out/relational-db.out-port.js';
import { PanelPromptValidationService } from '../../domain/services/PanelPromptValidationService.js';
import { CharacterBibleValidationService } from '../../application/services/CharacterBibleValidationService.js';

interface Character {
  name: string;
  role?: string;
  visual: string;
  traits?: string;
  consistency: string;
}

interface CharacterBibleData {
  characters: Character[];
}

/**
 * LangGraph orchestration adapter that manages the comic generation workflow.
 * Implements HITL (Human-in-the-Loop) using LangGraph's interrupt() mechanism.
 * The compiled graph is built once at construction and reused across all invocations.
 */
export class LangGraphOrchestrationAdapter {
  private readonly imageGenPort: ImageGenerationPort;
  private readonly llmClient: LLMClientPort;
  private readonly projectRepo: RelationalDbPort;
  private readonly graph;
  private readonly debug = process.env['PANELCRAFT_DEBUG'] === 'true';

  constructor(
    imageGenPort: ImageGenerationPort,
    llmClient: LLMClientPort,
    projectRepo: RelationalDbPort
  ) {
    this.imageGenPort = imageGenPort;
    this.llmClient = llmClient;
    this.projectRepo = projectRepo;
    this.graph = this.buildGraph();
  }

  getGraph() {
    return this.graph;
  }

  private buildGraph() {
    const checkpointer = new MemorySaver();

    const workflow = new StateGraph(ComicGraphState)
      .addNode('structureStory', this.structureStory.bind(this))
      .addNode('buildCharacterBible', this.buildCharacterBible.bind(this))
      .addNode('generatePanel', this.generatePanel.bind(this))
      .addNode('hitlReview', this.hitlReview.bind(this))
      .addNode('finalizeComic', this.finalizeComic.bind(this));

    workflow.addEdge(START, 'structureStory');
    workflow.addEdge('structureStory', 'buildCharacterBible');
    workflow.addEdge('buildCharacterBible', 'generatePanel');
    // Every generated panel goes through HITL review
    workflow.addEdge('generatePanel', 'hitlReview');
    // After review: regenerate if rejected, else advance to next panel or finalize
    workflow.addConditionalEdges('hitlReview', (state: ComicGraphStateType) => {
      if (!state.lastFeedback?.approved) return 'generatePanel';
      return state.currentPanelIndex < state.project.panelCount
        ? 'generatePanel'
        : 'finalizeComic';
    });
    workflow.addEdge('finalizeComic', END);

    return workflow.compile({ checkpointer });
  }

  private async structureStory(state: ComicGraphStateType) {
    const { prompt, panelCount } = state.project;

    console.log(`Structuring story into ${panelCount} panels...`);

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
      panelPrompts = await this.llmClient.call(systemPrompt, userPrompt);
    } catch (error) {
      // Re-throw domain errors without masking
      if (
        error instanceof LLMResponseParsingError ||
        error instanceof LLMResponseValidationError ||
        error instanceof ExternalServiceError
      ) {
        throw error;
      }
      // Wrap unexpected errors
      throw new LLMResponseParsingError(
        `structureStory failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Delegate validation to domain service
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

    // Now safe to assign
    const panels = state.project.panels || [];
    const updatedPanels = panels.map((panel: unknown, idx: number) => {
      const panelObj = panel as Record<string, unknown>;
      return {
        ...panelObj,
        prompt: (panelPrompts as string[])[idx],
      };
    });

    return {
      ...state,
      project: { ...state.project, panels: updatedPanels },
    };
  }

  private async buildCharacterBible(state: ComicGraphStateType) {
    const { prompt, panels } = state.project;
    const panelPrompts = (panels || [])
      .map((p: unknown) => {
        const panel = p as { prompt?: string };
        return panel.prompt || '';
      })
      .join('\n');

    console.log('Extracting and characterizing story characters...');

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
      characterData = await this.llmClient.call(systemPrompt, userPrompt);
    } catch (error) {
      // Re-throw domain errors without masking
      if (
        error instanceof LLMResponseParsingError ||
        error instanceof LLMResponseValidationError ||
        error instanceof ExternalServiceError
      ) {
        throw error;
      }
      // Wrap unexpected errors
      throw new LLMResponseParsingError(
        `buildCharacterBible failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    // Delegate validation to application service
    CharacterBibleValidationService.validate(characterData);

    if (this.debug) {
      console.log(
        '[buildCharacterBible Output]',
        JSON.stringify(characterData, null, 2)
      );
    }

    return {
      ...state,
      project: {
        ...state.project,
        characterBible: characterData as CharacterBibleData,
      },
    };
  }

  private async generatePanel(state: ComicGraphStateType) {
    const panelIndex = state.currentPanelIndex;
    const panels = state.project.panels || [];
    const panel = panels[panelIndex] as unknown;

    if (!panel || typeof panel !== 'object') {
      throw new Error(`Panel at index ${panelIndex} not found`);
    }

    const panelObj = panel as { prompt?: string };
    const prompt = panelObj.prompt?.trim();

    // Validate prompt is not empty before expensive image generation
    if (!prompt) {
      throw new Error(
        `[generatePanel] Panel ${panelIndex} has empty prompt. ` +
          'Cannot generate image without a valid prompt description.'
      );
    }

    const imageUrl = await this.imageGenPort.generatePanel({
      prompt,
      panelNumber: panelIndex + 1,
    });

    const updatedPanels = [...panels];
    updatedPanels[panelIndex] = {
      ...(panel as Record<string, unknown>),
      generatedImageUrl: imageUrl,
      status: 'generated',
    };

    return {
      ...state,
      project: { ...state.project, panels: updatedPanels },
      currentPanelIndex: panelIndex + 1,
    };
  }

  /**
   * HITL review node: pauses graph execution via interrupt() and waits for human feedback.
   * The interrupt payload is sent to the client; the resume value must match HITLFeedbackData.
   */
  private async hitlReview(state: ComicGraphStateType) {
    const reviewPanelIndex = state.currentPanelIndex - 1;
    const panels = state.project.panels || [];

    // interrupt() sends its argument (display payload) to the client; the resume
    // value is what the caller provides when continuing the thread. These are
    // different shapes, so we cast the return value to HITLFeedbackData explicitly.
    const feedback = interrupt({
      panelIndex: reviewPanelIndex,
      panel: panels[reviewPanelIndex],
      message: 'Review generated panel and provide feedback',
    }) as HITLFeedbackData;

    const newIndex = feedback.approved
      ? state.currentPanelIndex
      : state.currentPanelIndex - 1;

    return {
      ...state,
      lastFeedback: feedback,
      currentPanelIndex: newIndex,
    };
  }

  private async finalizeComic(state: ComicGraphStateType) {
    console.log('Finalizing comic project...');
    const project = ComicProject.fromJSON(state.project);
    await this.projectRepo.save(project);
    return state;
  }
}
