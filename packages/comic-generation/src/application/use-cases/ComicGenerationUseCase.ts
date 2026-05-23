import { RestControllerPort } from "../ports/in/rest-controller.in-port.js";
import type { RelationalDbPort } from "../ports/out/relational-db.out-port.js";
import type { JobQueuePort } from "../ports/out/job-queue.out-port.js";
import { randomUUID } from "node:crypto";

/**
 * Application use case for comic generation workflow orchestration.
 * Implements the RestControllerPort and coordinates project management
 * with background job queue execution of the LangGraph workflow.
 */
export class ComicGenerationUseCase implements RestControllerPort {
  constructor(
    private readonly projectRepo: RelationalDbPort,
    private readonly taskQueue: JobQueuePort
  ) {}

  async createProject(prompt: string, panelCount: number): Promise<string> {
    const projectId = randomUUID();

    // 1. Create and persist project domain entity
    const project = {
      id: projectId,
      prompt,
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
      status: "created",
    };
    await this.projectRepo.save(project);

    // 2. Dispatch job to background worker queue for async generation
    await this.taskQueue.add("start-comic", { projectId }, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: true,
    });

    return projectId;
  }

  async getProject(id: string): Promise<any> {
    return this.projectRepo.load(id);
  }

  async listProjects(): Promise<any[]> {
    return this.projectRepo.listAll();
  }

  async submitReview(
    projectId: string,
    approved: boolean,
    comment?: string,
    regenerationHint?: string
  ): Promise<void> {
    // Verify project exists and is in a reviewable state
    const project = await this.projectRepo.load(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    if (project.status !== "pending_review") {
      throw new Error(
        `Cannot submit review for project in status "${project.status}". ` +
        `Project must be in "pending_review" status.`
      );
    }

    // Prevent duplicate submissions by marking project as "processing" synchronously
    // This blocks concurrent review submissions while the job is being processed
    project.status = "processing";
    await this.projectRepo.save(project);

    // Dispatch resumption job containing the human feedback
    await this.taskQueue.add("resume-comic", {
      projectId,
      feedback: { approved, comment, regenerationHint },
    }, {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: true,
    });
  }
}
