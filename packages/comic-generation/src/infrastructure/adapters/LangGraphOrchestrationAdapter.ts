import { StateGraph, START, END, MemorySaver, interrupt } from "@langchain/langgraph";
import { ComicGraphState, ComicGraphStateType } from "../../domain/types/ComicGraphState";
import { ImageGenerationPort } from "../../application/ports/out/ImageGenerationPort";

/**
 * LangGraph orchestration adapter that manages the comic generation workflow.
 * Implements HITL (Human-in-the-Loop) using LangGraph's interrupt() mechanism.
 */
export class LangGraphOrchestrationAdapter {
  private imageGenPort: ImageGenerationPort;
  private projectRepo: any; // Using any to avoid cross-package type issues
  private checkpointer: MemorySaver;

  constructor(imageGenPort: ImageGenerationPort, projectRepo: any) {
    this.imageGenPort = imageGenPort;
    this.projectRepo = projectRepo;
    this.checkpointer = new MemorySaver();
  }

  /**
   * Creates and compiles the LangGraph workflow.
   * The graph handles: story structuring → character bible → panel generation → HITL review loop.
   */
  async createGraph() {
    const workflow = new StateGraph(ComicGraphState)
      .addNode("structureStory", this.structureStory.bind(this))
      .addNode("buildCharacterBible", this.buildCharacterBible.bind(this))
      .addNode("generatePanel", this.generatePanel.bind(this))
      .addNode("hitlReview", this.hitlReview.bind(this))
      .addNode("finalizeComic", this.finalizeComic.bind(this));

    // Initial flow
    workflow.addEdge(START, "structureStory");
    workflow.addEdge("structureStory", "buildCharacterBible");
    workflow.addEdge("buildCharacterBible", "generatePanel");

    // After generating a panel: go to HITL if more panels exist, else finalize
    workflow.addConditionalEdges("generatePanel", (state: ComicGraphStateType) => 
      state.currentPanelIndex < state.project.panelCount ? "hitlReview" : "finalizeComic"
    );

    // After HITL review: regenerate if not approved, else continue to next panel/finalize
    workflow.addConditionalEdges("hitlReview", (state: ComicGraphStateType) => 
      state.currentPanelIndex < state.project.panelCount ? "generatePanel" : "finalizeComic"
    );

    workflow.addEdge("finalizeComic", END);

    return workflow.compile({ checkpointer: this.checkpointer });
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

    // Update panel with generated image (entities are mutable by design)
    panel.generatedImageUrl = imageUrl;
    panel.status = "generated";

    return {
      ...state,
      currentPanelIndex: panelIndex + 1,
    };
  }

  /**
   * HITL (Human-in-the-Loop) review node.
   * Uses LangGraph's interrupt() to pause execution and wait for human feedback.
   */
  private async hitlReview(state: ComicGraphStateType) {
    const currentPanelIndex = state.currentPanelIndex - 1;
    
    // Interrupt graph execution to wait for human feedback
    // The argument to interrupt() is sent to the client
    const feedback = interrupt<any>({
      panelIndex: currentPanelIndex,
      panel: state.project.panels[currentPanelIndex],
      message: "Review generated panel and provide feedback",
    });

    // If not approved, decrement index to regenerate the same panel
    const newIndex = feedback?.approved ? state.currentPanelIndex : state.currentPanelIndex - 1;

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
