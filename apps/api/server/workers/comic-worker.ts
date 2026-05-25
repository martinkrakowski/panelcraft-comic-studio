import { Worker, Job, Queue } from 'bullmq';
import { Command } from '@langchain/langgraph';
import type { LangGraphOrchestrationAdapter } from '@panelcraft/comic-generation';
import type { RelationalDbPort } from '@panelcraft/comic-generation';
import { ComicProject } from '@panelcraft/comic-project-management';
import type { LoggerPort } from '@panelcraft/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

interface ComicJobData {
  projectId: string;
  selectedLayout?: string;
  feedback?: {
    approved: boolean;
    comment?: string;
    regenerationHint?: string;
  };
}

/**
 * Initialises the BullMQ worker that drives the comic-generation pipeline.
 *
 * Creates a `Worker` bound to the `comic-generation-queue` and registers a
 * job processor that dispatches on `job.name`:
 *  - `start-comic`: kicks off the LangGraph workflow for a fresh project,
 *    pausing at the layout interrupt and persisting `pending_layout` status.
 *  - `resume-comic`: re-invokes the graph with the user's `selectedLayout`
 *    and (when present) panel `feedback`, generating exactly one panel per
 *    invocation and saving `pending_review` (or `completed`) status.
 * On terminal failure the worker rolls the project back to a safe status
 * before surrendering the job.
 *
 * @param langGraphAdapter - Compiled LangGraph workflow to invoke per job.
 * @param projectRepo - Repository used to hydrate/save project state.
 * @param queue - The BullMQ queue this worker drains.
 * @param logger - Project logger for diagnostic output.
 * @param supabase - Service-role Supabase client (storage signed URLs,
 *   checkpointer access).
 * @returns The constructed BullMQ `Worker`. Caller is responsible for
 *   closing it on graceful shutdown.
 */
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
    async (job: Job<ComicJobData>) => {
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
            if (
              err &&
              typeof err === 'object' &&
              'name' in err &&
              ['NodeInterrupt', 'GraphInterrupt'].includes(
                (err as { name: string }).name
              )
            ) {
              logger.info(
                `[Worker] Project ${projectId} paused by expected workflow interrupt`
              );
            } else {
              throw err;
            }
          }

          // The first interrupt in the workflow is the layout interrupt. If
          // selectedLayout is still missing in the graph state we know the
          // run paused there; persist pending_layout so the UI can render the
          // layout chooser. Otherwise the run progressed past layout and
          // interrupted at hitlReview after generating panel 0.
          const startState = await graph.getState({
            configurable: { thread_id: projectId },
          });
          if (!startState.values.selectedLayout) {
            const updatedProject = ComicProject.fromJSON(
              startState.values.project
            );
            if (startState.values.coverImageUrl) {
              updatedProject.setCoverImageUrl(startState.values.coverImageUrl);
            }
            if (Array.isArray(startState.values.layoutOptions)) {
              updatedProject.setLayoutOptions(startState.values.layoutOptions);
            }
            updatedProject.setStatus('pending_layout');
            await projectRepo.save(updatedProject);
            logger.info(
              `[Worker] Project ${projectId} paused for layout selection`
            );
            return;
          }

          const currentThreadState = await graph.getState({
            configurable: { thread_id: projectId },
          });
          const projectJson = currentThreadState.values.project;
          const updatedProject = ComicProject.fromJSON(projectJson);
          if (currentThreadState.values.coverImageUrl) {
            updatedProject.setCoverImageUrl(
              currentThreadState.values.coverImageUrl
            );
          }
          if (Array.isArray(currentThreadState.values.layoutOptions)) {
            updatedProject.setLayoutOptions(
              currentThreadState.values.layoutOptions
            );
          }
          updatedProject.setStatus('pending_review');
          await projectRepo.save(updatedProject);

          logger.info(
            `[Worker] First panel generated for project ${projectId}. Waiting for HITL review.`
          );
        } else if (job.name === 'resume-comic') {
          const { selectedLayout, feedback } = job.data;
          logger.info(
            `[Worker] Resuming workflow for project ${projectId} ` +
              `(layout: ${selectedLayout || 'from project'}, ` +
              `feedback: ${feedback ? 'present' : 'none'})`
          );

          // Build the LangGraph Command that resumes the suspended graph.
          // The first interrupt() encountered after resume returns this value
          // (consumeNullResume removes it after first use, so any later
          // interrupt() in the same invoke — e.g. the *next* hitlReview after
          // generatePanel in the in-graph loop — will throw and pause again).
          let resumeValue: unknown;
          if (feedback) {
            resumeValue = feedback;
          } else if (selectedLayout) {
            resumeValue = { selectedLayout };
          } else {
            throw new Error(
              `[Worker] resume-comic requires either feedback or selectedLayout`
            );
          }

          try {
            await graph.invoke(new Command({ resume: resumeValue }), {
              configurable: { thread_id: projectId },
            });
          } catch (err) {
            if (
              err &&
              typeof err === 'object' &&
              'name' in err &&
              ['NodeInterrupt', 'GraphInterrupt'].includes(
                (err as { name: string }).name
              )
            ) {
              logger.info(
                `[Worker] Project ${projectId} paused by expected workflow interrupt`
              );
            } else {
              throw err;
            }
          }

          const currentThreadState = await graph.getState({
            configurable: { thread_id: projectId },
          });
          const projectJson = currentThreadState.values.project;
          const updatedProject = ComicProject.fromJSON(projectJson);
          if (currentThreadState.values.coverImageUrl) {
            updatedProject.setCoverImageUrl(
              currentThreadState.values.coverImageUrl
            );
          }
          if (Array.isArray(currentThreadState.values.layoutOptions)) {
            updatedProject.setLayoutOptions(
              currentThreadState.values.layoutOptions
            );
          }
          const rawPanelCount = updatedProject.getPanelCount();
          const panelCountValue =
            typeof rawPanelCount === 'number'
              ? rawPanelCount
              : rawPanelCount.getValue();

          const completedPanelCount = updatedProject
            .getPanels()
            .filter((p) => p.getStatus().getValue() === 'completed').length;

          if (completedPanelCount >= panelCountValue) {
            updatedProject.setStatus('completed');
            logger.info(
              `[Worker] Comic generation completed for project ${projectId}.`
            );
          } else {
            updatedProject.setStatus('pending_review');
            logger.info(
              `[Worker] Panel ${currentThreadState.values.currentPanelIndex} generated. ` +
                `Waiting for HITL review (${completedPanelCount}/${panelCountValue} completed).`
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
