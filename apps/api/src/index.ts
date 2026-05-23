import express from "express";
import { ValidationError, NotFoundError, errorToHttpStatus } from "@panelcraft/shared";
import { LangGraphOrchestrationAdapter } from "@panelcraft/comic-generation";

const app = express();
app.use(express.json());

// In-memory project storage for demo (maps threadId -> project state)
const projects = new Map<string, any>();
let nextProjectId = 1;

// Mock image generation port (TODO: integrate with real service)
const mockImageGenPort = {
  generatePanel: async (opts: any) => {
    console.log(`[Mock] Generating image for panel ${opts.panelNumber}: ${opts.prompt.substring(0, 50)}...`);
    // Simulate generation delay
    await new Promise((r) => setTimeout(r, 500));
    return `https://example.com/panels/${opts.panelNumber}.png`;
  },
};

// Mock project repository
const mockProjectRepo = {
  save: async (project: any) => {
    console.log(`[Mock] Saving project: ${project.id}`);
    projects.set(project.id, project);
  },
  load: async (id: string) => {
    return projects.get(id);
  },
};

// Initialize the LangGraph adapter
const langGraphAdapter = new LangGraphOrchestrationAdapter(mockImageGenPort, mockProjectRepo);

/**
 * POST /api/projects
 * Create a new comic project and start generation workflow
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

    // Create project
    const projectId = String(nextProjectId++);
    const project = {
      id: projectId,
      prompt: trimmedPrompt,
      panelCount,
      panels: Array.from({ length: panelCount }, (_, i) => ({
        id: `panel-${i}`,
        index: i,
        prompt: "",
        status: "pending",
        generatedImageUrl: null,
      })),
      characterBible: null,
      createdAt: new Date().toISOString(),
      status: "generating",
    };

    projects.set(projectId, project);

    // Trigger async generation (in real app, this would be a background job)
    // For now, just mark it as created
    console.log(`[API] Created project ${projectId}`);

    res.status(201).json({
      id: projectId,
      prompt: project.prompt,
      panelCount,
      status: "created",
      createdAt: project.createdAt,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/projects/:id
 * Retrieve project status and panel information
 */
app.get("/api/projects/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const project = projects.get(id);

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
 * List all projects
 */
app.get("/api/projects", async (req, res, next) => {
  try {
    const projectList = Array.from(projects.values()).map((p) => ({
      id: p.id,
      prompt: p.prompt.substring(0, 50),
      panelCount: p.panelCount,
      status: p.status,
      createdAt: p.createdAt,
    }));

    res.json(projectList);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/projects/:id/review
 * Submit HITL review feedback and resume generation
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

    const project = projects.get(id);
    if (!project) {
      return res.status(404).json({
        error: `Project with id ${id} not found`,
      });
    }

    console.log(`[API] Review for project ${id}: approved=${approved}, comment=${comment}`);
    // In real implementation, this would resume the LangGraph thread with the feedback

    res.json({ message: "Review submitted", projectId: id });
  } catch (error) {
    next(error);
  }
});

// Global error handler
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

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API server listening on port ${PORT}`);
});

export function main(): void {
  // Bootstrap complete
}
