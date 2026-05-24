import { Annotation } from '@langchain/langgraph';
import type { ComicProjectJSON } from '../../domain/types/ComicProjectJSON.js';
import type { HITLFeedbackData } from '../../domain/value-objects/HITLFeedback.vo.js';

/**
 * LangGraph state definition for the comic generation workflow.
 * Uses `Annotation.Root` to define state shape with type safety.
 * Project is always in JSON representation during workflow execution.
 */
export const ComicGraphState = Annotation.Root({
  /** Active comic project being generated (JSON representation) */
  project: Annotation<ComicProjectJSON>(),

  /** 0-based index of the next panel to generate */
  currentPanelIndex: Annotation<number>(),

  /** Latest human feedback from HITL review (null if no review yet) */
  lastFeedback: Annotation<HITLFeedbackData | null>(),

  /** LangGraph thread ID for persistent session tracking */
  threadId: Annotation<string>(),
});

/** Type alias for the inferred state shape */
export type ComicGraphStateType = typeof ComicGraphState.State;
