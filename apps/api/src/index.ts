import express from "express";
import { Queue } from "bullmq";
import { ValidationError, NotFoundError, errorToHttpStatus } from "@panelcraft/shared";
import { ComicGenerationUseCase, LangGraphOrchestrationAdapter } from "@panelcraft/comic-generation";
import { initComicWorker } from "./workers/comic-worker.js";
import { BullMQJobQueueAdapter } from "./adapters/BullMQJobQueueAdapter.js";
import { XaiLLMClientAdapter } from "./adapters/XaiLLMClientAdapter.js";

const app = express();
app.use(express.json());

// ============================================================================
// Infrastructure Setup: Database and Queue
// ============================================================================

/**
 * In-memory project repository for demo.
 * For production, implement with PostgreSQL or similar persistent storage.
 */
class InMemoryProjectRepository {
  private projects = new Map<string, any>();

  async save(project: any): Promise<void> {
    this.projects.set(project.id, project);
  }

  async load(id: string): Promise<any | null> {
    return this.projects.get(id) ?? null;
  }

  async listAll(): Promise<any[]> {
    return Array.from(this.projects.values());
  }
}

const projectRepo = new InMemoryProjectRepository();

// ============================================================================
// Message Queue Setup
// ============================================================================

const redisConnection = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379", 10),
};

const bullMQQueue = new Queue("comic-generation-queue", { connection: redisConnection });
const jobQueueAdapter = new BullMQJobQueueAdapter(bullMQQueue);

// ============================================================================
// LangGraph & Use Case Setup
// ============================================================================

/**
 * Mock image generation port for demo.
 * For production, integrate with actual image generation service (Firefly, DALL-E, etc.)
 */
const mockImageGenPort = {
  generatePanel: async (opts: any) => {
    console.log(`[Mock] Generating image for panel ${opts.panelNumber}: ${opts.prompt.substring(0, 50)}...`);
    await new Promise((r) => setTimeout(r, 500));
    return `https://example.com/panels/${opts.panelNumber}.png`;
  },
};

// Initialize LLM client adapter for xAI integration
const llmClientAdapter = new XaiLLMClientAdapter();

// Initialize orchestration adapter with ports
const langGraphAdapter = new LangGraphOrchestrationAdapter(mockImageGenPort, llmClientAdapter, projectRepo);

// Initialize application use case implementing RestControllerPort
const comicUseCase = new ComicGenerationUseCase(projectRepo, jobQueueAdapter);

// Initialize background worker for job queue
initComicWorker(langGraphAdapter, projectRepo, bullMQQueue);

// ============================================================================
// REST API Endpoints
// ============================================================================

/**
 * POST /api/projects
 * Create a new comic project and enqueue background generation workflow.
 */
app.post("/api/projects", async (req, res, next) => {
  try {
    const { prompt, panelCount } = req.body;

    // Type validation
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({
        error: "prompt is required and must be a string",
      });
    }

    if (typeof panelCount !== "number" || !Number.isInteger(panelCount)) {
      return res.status(400).json({
        error: "panelCount must be an integer",
      });
    }

    // Range validation
    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length < 10) {
      return res.status(400).json({
        error: "prompt must be at least 10 characters",
      });
    }

    if (trimmedPrompt.length > 1000) {
      return res.status(400).json({
        error: "prompt cannot exceed 1000 characters",
      });
    }

    if (panelCount < 1 || panelCount > 20) {
      return res.status(400).json({
        error: "panelCount must be between 1 and 20",
      });
    }

    // Delegate to use case (which persists and enqueues workflow)
    const projectId = await comicUseCase.createProject(trimmedPrompt, panelCount);

    res.status(201).json({
      id: projectId,
      prompt: trimmedPrompt,
      panelCount,
      status: "created",
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/:id
 * Retrieve project status and panel information.
 */
app.get("/api/projects/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = await comicUseCase.getProject(id);

    if (!project) {
      return res.status(404).json({
        error: `Project with id ${id} not found`,
      });
    }

    res.json({
      id: project.id,
      prompt: project.prompt,
      panelCount: project.panelCount,
      status: project.status,
      createdAt: project.createdAt,
      panels: project.panels.map((p: any) => ({
        id: p.id,
        index: p.index,
        status: p.status,
        imageUrl: p.generatedImageUrl,
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects
 * List all projects.
 */
app.get("/api/projects", async (req, res, next) => {
  try {
    const projects = await comicUseCase.listProjects();

    res.json(
      projects.map((p) => ({
        id: p.id,
        prompt: p.prompt.substring(0, 50),
        panelCount: p.panelCount,
        status: p.status,
        createdAt: p.createdAt,
      }))
    );
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:id/review
 * Submit HITL review feedback and enqueue workflow resumption.
 */
app.post("/api/projects/:id/review", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approved, comment } = req.body;

    if (typeof approved !== "boolean") {
      return res.status(400).json({
        error: "approved field must be a boolean",
      });
    }

    // Delegate to use case (which enqueues resumption job)
    await comicUseCase.submitReview(id, approved, comment);

    res.json({ message: "Review submitted. Workflow resumption queued.", projectId: id });
  } catch (error) {
    next(error);
  }
});

// ============================================================================
// Global Error Handler
// ============================================================================

app.use(
  (error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    const status = errorToHttpStatus(error);
    const message = error.message || "Internal server error";

    console.error(`[${status}] ${message}`);

    res.status(status).json({
      error: message,
      ...(process.env.NODE_ENV === "development" && { stack: error.stack }),
    });
  }
);

// ============================================================================
// Server Startup
// ============================================================================

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server listening on port ${PORT}`);
  console.log(`BullMQ worker connected to Redis at ${redisConnection.host || "localhost"}:${redisConnection.port || 6379}`);
});

export function main(): void {
  // Bootstrap complete
}
