import { Worker, Job, Queue } from 'bullmq';
import type { LangGraphOrchestrationAdapter } from '@panelcraft/comic-generation';
import type { RelationalDbPort } from '@panelcraft/comic-generation';
import { ComicProject } from '@panelcraft/comic-project-management';
import type { LoggerPort } from '@panelcraft/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

export function initComicWorker(
  langGraphAdapter: LangGraphOrchestrationAdapter,
  projectRepo: RelationalDbPort,
  queue: Queue,
  logger: LoggerPort,
  supabase: SupabaseClient
) {
  const graph = langGraphAdapter.getGraph();

  return new Worker(
    'comic-generation-queue',
    async (job: Job<Record<string, unknown>>) => {
      const { projectId } = job.data;

      try {
        const project = await projectRepo.load(projectId);
        if (!project) throw new Error(`Project ${projectId} not found`);

        if (job.name === 'start-comic') {
          logger.info(
            `[Worker] Starting comic generation for project: ${projectId}`
          );

          try {
            await graph.invoke(
              {
                project: project.toJSON(),
                currentPanelIndex: 0,
                lastFeedback: null,
                threadId: projectId,
              },
              { configurable: { thread_id: projectId } }
            );
          } catch (err) {
            // Handle layout interrupt (NodeInterrupt from LangGraph)
            if (err?.name === 'NodeInterrupt') {
              const state = await graph.getState({
                configurable: { thread_id: projectId },
              });
              const updatedProject = ComicProject.fromJSON(
                state.values.project
              );
              updatedProject.setStatus('pending_layout');
              await projectRepo.save(updatedProject);
              logger.info(
                `[Worker] Project ${projectId} paused for layout selection`
              );
              return;
            }
            throw err;
          }

          const currentThreadState = await graph.getState({
            configurable: { thread_id: projectId },
          });
          const projectJson = currentThreadState.values.project;
          const updatedProject = ComicProject.fromJSON(projectJson);
          updatedProject.setStatus('pending_review');
          await projectRepo.save(updatedProject);

          logger.info(
            `[Worker] First panel generated for project ${projectId}. Waiting for HITL review.`
          );
        } else if (job.name === 'resume-comic') {
          const { selectedLayout } = job.data;
          logger.info(
            `[Worker] Resuming workflow for project ${projectId} with layout: ${selectedLayout}`
          );

          await graph.invoke(
            { selectedLayout },
            {
              configurable: { thread_id: projectId },
            }
          );

          const currentThreadState = await graph.getState({
            configurable: { thread_id: projectId },
          });
          const projectJson = currentThreadState.values.project;
          const updatedProject = ComicProject.fromJSON(projectJson);
          const panelCountValue =
            typeof updatedProject.getPanelCount() === 'number'
              ? updatedProject.getPanelCount()
              : updatedProject.getPanelCount().getValue();

          if (currentThreadState.values.currentPanelIndex >= panelCountValue) {
            updatedProject.setStatus('completed');
            logger.info(
              `[Worker] Comic generation completed for project ${projectId}.`
            );
          } else {
            updatedProject.setStatus('pending_review');
            logger.info(
              `[Worker] Panel ${currentThreadState.values.currentPanelIndex} generated. ` +
                `Waiting for HITL review (${currentThreadState.values.currentPanelIndex}/${panelCountValue}).`
            );
          }
          await projectRepo.save(updatedProject);
        }
      } catch (error) {
        logger.error(
          `[Worker] Error processing job ${job.id}:`,
          error as Error
        );

        const totalAttempts = job.opts.attempts ?? 1;
        if (job.attemptsMade + 1 >= totalAttempts) {
          try {
            const project = await projectRepo.load(projectId);
            if (project) {
              const currentStatus = project.getStatus();
              if (currentStatus === 'processing') {
                project.setStatus('pending_review');
              } else if (
                job.name === 'start-comic' &&
                currentStatus === 'created'
              ) {
                project.setStatus('failed');
              }
              await projectRepo.save(project);
              logger.warn(
                `[Worker] Job ${job.id} failed permanently. ` +
                  `Updated project ${projectId} to "${project.getStatus()}".`
              );
            }
          } catch (recoveryError) {
            logger.error(
              `[Worker] Failed to recover project ${projectId}:`,
              recoveryError as Error
            );
          }
        }
        throw error;
      }
    },
    { connection: queue.opts.connection }
  );
}
