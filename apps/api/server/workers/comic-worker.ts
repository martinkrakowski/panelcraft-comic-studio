import { Worker, Job, Queue } from "bullmq";
import type { LangGraphOrchestrationAdapter } from "@panelcraft/comic-generation";
import type { RelationalDbPort } from "@panelcraft/comic-generation";
import { ComicProject } from "@panelcraft/comic-project-management";

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
          const projectJson = currentThreadState.values.project;

          // Convert JSON state back to ComicProject entity (workflow stores as JSON to avoid prototype issues)
          const updatedProject = ComicProject.fromJSON(projectJson);
          updatedProject.setStatus("pending_review");
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
          const projectJson = currentThreadState.values.project;

          // Convert JSON state back to ComicProject entity
          const updatedProject = ComicProject.fromJSON(projectJson);
          const panelCountValue = typeof updatedProject.getPanelCount() === 'number'
            ? updatedProject.getPanelCount()
            : updatedProject.getPanelCount().getValue();

          // Update project status based on workflow completion
          if (currentThreadState.values.currentPanelIndex >= panelCountValue) {
            updatedProject.setStatus("completed");
            console.log(`[Worker] Comic generation completed for project ${projectId}.`);
          } else {
            updatedProject.setStatus("pending_review");
            console.log(
              `[Worker] Panel ${currentThreadState.values.currentPanelIndex} generated. ` +
              `Waiting for HITL review (${currentThreadState.values.currentPanelIndex}/${panelCountValue}).`
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
              const currentStatus = project.getStatus();
              if (currentStatus === "processing") {
                project.setStatus("pending_review");
              } else if (job.name === "start-comic" && currentStatus === "created") {
                project.setStatus("failed");
              }

              await projectRepo.save(project);
              console.warn(
                `[Worker] Job ${job.id} failed permanently. ` +
                `Updated project ${projectId} to "${project.getStatus()}".`
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
