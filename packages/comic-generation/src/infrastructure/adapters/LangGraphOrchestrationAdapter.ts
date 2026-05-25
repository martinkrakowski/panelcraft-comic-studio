import { StateGraph, START, END } from '@langchain/langgraph';
import type { LoggerPort } from '@panelcraft/shared';
import {
  ComicGraphState,
  ComicGraphStateType,
} from '../types/ComicGraphState.js';
import type { ImageGenerationPort } from '../../application/ports/out/image-generation.out-port.js';
import type { LLMClientPort } from '../../application/ports/out/llm-client.out-port.js';
import type { RelationalDbPort } from '../../application/ports/out/relational-db.out-port.js';
import { SupabaseCheckpointer } from './SupabaseCheckpointer.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { WorkflowDeps } from './ComicWorkflowTypes.js';
import { structureStory, buildCharacterBible } from './StoryStructureNodes.js';
import {
  generateCover,
  suggestLayouts,
  layoutInterrupt,
  generatePanel,
  hitlReview,
  finalizeComic,
} from './ImageGenerationNodes.js';

/**
 * LangGraph orchestration adapter that manages the comic generation workflow.
 * Implements HITL (Human-in-the-Loop) using LangGraph's interrupt() mechanism.
 * The compiled graph is built once at construction and reused across all invocations.
 */
export class LangGraphOrchestrationAdapter {
  private readonly deps: WorkflowDeps;
  private readonly graph;

  constructor(
    imageGenPort: ImageGenerationPort,
    llmClient: LLMClientPort,
    projectRepo: RelationalDbPort,
    logger: LoggerPort,
    supabase: SupabaseClient
  ) {
    this.deps = { imageGenPort, llmClient, projectRepo, logger, supabase };
    this.graph = this.buildGraph();
  }

  getGraph() {
    return this.graph;
  }

  private buildGraph() {
    const checkpointer = new SupabaseCheckpointer(this.deps.supabase);
    const d = this.deps;

    const workflow = new StateGraph(ComicGraphState)
      .addNode('structureStory', (s: ComicGraphStateType) =>
        structureStory(s, d)
      )
      .addNode('buildCharacterBible', (s: ComicGraphStateType) =>
        buildCharacterBible(s, d)
      )
      .addNode('generateCover', (s: ComicGraphStateType) => generateCover(s, d))
      .addNode('suggestLayouts', (s: ComicGraphStateType) =>
        suggestLayouts(s, d)
      )
      .addNode('layoutInterrupt', (s: ComicGraphStateType) =>
        layoutInterrupt(s, d)
      )
      .addNode('generatePanel', (s: ComicGraphStateType) => generatePanel(s, d))
      .addNode('hitlReview', (s: ComicGraphStateType) => hitlReview(s, d))
      .addNode('finalizeComic', (s: ComicGraphStateType) =>
        finalizeComic(s, d)
      );

    workflow.addEdge(START, 'structureStory');
    workflow.addEdge('structureStory', 'buildCharacterBible');
    workflow.addEdge('buildCharacterBible', 'generateCover');
    workflow.addEdge('generateCover', 'suggestLayouts');
    workflow.addEdge('suggestLayouts', 'layoutInterrupt');
    workflow.addEdge('layoutInterrupt', 'generatePanel');
    workflow.addEdge('generatePanel', 'hitlReview');
    // hitlReview either:
    //  - finalizes the comic if all panels are reviewed,
    //  - loops back to generatePanel for the next panel (after applying
    //    feedback from a previous resume), or
    //  - interrupts and waits for the next user review.
    // The in-graph loop is safe because hitlReview clears lastFeedback after
    // applying it, so subsequent invocations of the node within the same run
    // will hit the interrupt() path instead of cascading.
    workflow.addConditionalEdges('hitlReview', (state: ComicGraphStateType) => {
      if (state.currentPanelIndex >= state.project.panelCount) {
        return 'finalizeComic';
      }
      return 'generatePanel';
    });
    workflow.addEdge('finalizeComic', END);

    return workflow.compile({ checkpointer });
  }
}
