import { Worker, Job, Queue } from "bullmq";
import type { LangGraphOrchestrationAdapter } from "@panelcraft/comic-generation";
import type { RelationalDbPort } from "@panelcraft/comic-generation";

/**
 * Comic generation worker processes jobs from the task queue.
 * Runs LangGraph workflow in background to avoid blocking Express server.
 */
export function initComicWorker(
  langGraphAdapter: LangGraphOrchestrationAdapter,
  projectRepo: RelationalDbPort,
  queue: Queue
) {
  const graph = langGraphAdapter.getGraph();

  return new Worker(
    "comic-generation-queue",
    async (job: Job) => {
      const { projectId } = job.data;

      try {
        const project = await projectRepo.load(projectId);
        if (!project) {
          throw new Error(`Project ${projectId} not found`);
        }

        if (job.name === "start-comic") {
          console.log(`[Worker] Starting comic generation for project: ${projectId}`);

          // Invoke graph with thread ID matching projectId for state persistence
          await graph.invoke(
            {
              project,
              currentPanelIndex: 0,
              lastFeedback: null,
              threadId: projectId,
            },
            { configurable: { thread_id: projectId } }
          );

          // CRITICAL: Retrieve updated project state from graph checkpointer
          // The invoke() call generates panel descriptions, character bible, and images,
          // but these updates exist only in the graph's checkpointer, not in the stale
          // project variable loaded at the start of the job.
          // Without this fetch, we would save an empty project, losing all generated data.
          const currentThreadState = await graph.getState({
            configurable: { thread_id: projectId }
          });
          const updatedProject = currentThreadState.values.project;

          // Update project status to indicate workflow is waiting on human review
          updatedProject.status = "pending_review";
          await projectRepo.save(updatedProject);

          console.log(`[Worker] First panel generated for project ${projectId}. Waiting for HITL review.`);
        }

        else if (job.name === "resume-comic") {
          const { feedback } = job.data;
          console.log(`[Worker] Resuming workflow for project ${projectId} with feedback:`, feedback);

          // Resume the graph with human feedback
          // In LangGraph.js, providing resume payload passes it directly to the active interrupt node
          await graph.invoke(feedback, {
            configurable: { thread_id: projectId },
          });

          // Retrieve updated project state from graph
          const currentThreadState = await graph.getState({
            configurable: { thread_id: projectId }
          });
          const updatedProject = currentThreadState.values.project;

          // Update project status based on workflow completion
          if (currentThreadState.values.currentPanelIndex >= updatedProject.panelCount) {
            updatedProject.status = "completed";
            console.log(`[Worker] Comic generation completed for project ${projectId}.`);
          } else {
            updatedProject.status = "pending_review";
            console.log(
              `[Worker] Panel ${currentThreadState.values.currentPanelIndex} generated. ` +
              `Waiting for HITL review (${currentThreadState.values.currentPanelIndex}/${updatedProject.panelCount}).`
            );
          }
          await projectRepo.save(updatedProject);
        }
      } catch (error) {
        console.error(`[Worker] Error processing job ${job.id}:`, error);

        // If this is the last attempt, reset project status to allow recovery
        const totalAttempts = job.opts.attempts ?? 1;
        if (job.attemptsMade + 1 >= totalAttempts) {
          try {
            const project = await projectRepo.load(projectId);
            if (project) {
              if (project.status === "processing") {
                project.status = "pending_review";
              } else if (job.name === "start-comic" && project.status === "created") {
                project.status = "failed";
              }

              await projectRepo.save(project);
              console.warn(
                `[Worker] Job ${job.id} failed permanently. ` +
                `Updated project ${projectId} to "${project.status}".`
              );
            }
          } catch (recoveryError) {
            console.error(`[Worker] Failed to recover project ${projectId}:`, recoveryError);
          }
        }

        throw error; // BullMQ will handle final retry failure
      }
    },
    { connection: queue.opts.connection }
  );
}
