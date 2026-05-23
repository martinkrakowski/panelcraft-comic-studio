import { Annotation } from "@langchain/langgraph";
import type { HITLFeedback } from "../value-objects/HITLFeedback.vo.js";

/**
 * LangGraph state definition for the comic generation workflow.
 * Uses `Annotation.Root` to define state shape with type safety.
 * Uses `any` for ComicProject to avoid cross-package import issues.
 */
export const ComicGraphState = Annotation.Root({
  /** Active comic project being generated */
  project: Annotation<any>(),

  /** 0-based index of the next panel to generate */
  currentPanelIndex: Annotation<number>(),

  /** Latest human feedback from HITL review (null if no review yet) */
  lastFeedback: Annotation<HITLFeedback | null>(),

  /** LangGraph thread ID for persistent session tracking */
  threadId: Annotation<string>(),
});

/** Type alias for the inferred state shape */
export type ComicGraphStateType = typeof ComicGraphState.State;
