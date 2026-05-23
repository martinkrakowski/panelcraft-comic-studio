import { StateGraph, START, END, MemorySaver, interrupt } from "@langchain/langgraph";
import { ComicGraphState, ComicGraphStateType } from "../../domain/types/ComicGraphState.js";
import type { HITLFeedbackData } from "../../domain/value-objects/HITLFeedback.vo.js";
import type { ImageGenerationPort } from "../../application/ports/out/ImageGenerationPort.js";

/**
 * LangGraph orchestration adapter that manages the comic generation workflow.
 * Implements HITL (Human-in-the-Loop) using LangGraph's interrupt() mechanism.
 * The compiled graph is built once at construction and reused across all invocations.
 */
export class LangGraphOrchestrationAdapter {
  private readonly imageGenPort: ImageGenerationPort;
  private readonly projectRepo: any;
  private readonly graph;

  constructor(imageGenPort: ImageGenerationPort, projectRepo: any) {
    this.imageGenPort = imageGenPort;
    this.projectRepo = projectRepo;
    this.graph = this.buildGraph();
  }

  getGraph() {
    return this.graph;
  }

  private buildGraph() {
    const checkpointer = new MemorySaver();

    const workflow = new StateGraph(ComicGraphState)
      .addNode("structureStory", this.structureStory.bind(this))
      .addNode("buildCharacterBible", this.buildCharacterBible.bind(this))
      .addNode("generatePanel", this.generatePanel.bind(this))
      .addNode("hitlReview", this.hitlReview.bind(this))
      .addNode("finalizeComic", this.finalizeComic.bind(this));

    workflow.addEdge(START, "structureStory");
    workflow.addEdge("structureStory", "buildCharacterBible");
    workflow.addEdge("buildCharacterBible", "generatePanel");
    // Every generated panel goes through HITL review
    workflow.addEdge("generatePanel", "hitlReview");
    // After review: regenerate if rejected, else advance to next panel or finalize
    workflow.addConditionalEdges("hitlReview", (state: ComicGraphStateType) => {
      if (!state.lastFeedback?.approved) return "generatePanel";
      return state.currentPanelIndex < state.project.panelCount
        ? "generatePanel"
        : "finalizeComic";
    });
    workflow.addEdge("finalizeComic", END);

    return workflow.compile({ checkpointer });
  }

  private async structureStory(state: ComicGraphStateType) {
    console.log("Structuring story into panels...");
    return state;
  }

  private async buildCharacterBible(state: ComicGraphStateType) {
    console.log("Building character bible...");
    return state;
  }

  private async generatePanel(state: ComicGraphStateType) {
    const panelIndex = state.currentPanelIndex;
    const panel = state.project.panels[panelIndex];

    if (!panel) {
      throw new Error(`Panel at index ${panelIndex} not found`);
    }

    const imageUrl = await this.imageGenPort.generatePanel({
      prompt: panel.prompt,
      panelNumber: panelIndex + 1,
    });

    const updatedPanels = [...state.project.panels];
    updatedPanels[panelIndex] = { ...panel, generatedImageUrl: imageUrl, status: "generated" };

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

    // interrupt() sends its argument (display payload) to the client; the resume
    // value is what the caller provides when continuing the thread. These are
    // different shapes, so we cast the return value to HITLFeedbackData explicitly.
    const feedback = interrupt({
      panelIndex: reviewPanelIndex,
      panel: state.project.panels[reviewPanelIndex],
      message: "Review generated panel and provide feedback",
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
    console.log("Finalizing comic project...");
    await this.projectRepo.save(state.project);
    return state;
  }
}
