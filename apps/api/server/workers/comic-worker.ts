import { Worker, Job, Queue } from 'bullmq';
import { Command } from '@langchain/langgraph';
import type {
  LangGraphOrchestrationAdapter,
  ImageGenerationPort,
  ImageCompositionPort,
  LLMClientPort,
} from '@panelcraft/comic-generation';
import {
  PENDING_REVIEW_EXTEND_STATUS,
  PENDING_REVIEW_FINAL_STATUS,
  PENDING_REVIEW_COVER_STATUS,
} from '@panelcraft/comic-generation';
import type { RelationalDbPort } from '@panelcraft/comic-generation';
import {
  ComicProject,
  PanelStatus,
} from '@panelcraft/comic-project-management';
import type { LoggerPort } from '@panelcraft/shared';
import {
  getLayoutById,
  DEFAULT_FALLBACK_LAYOUT,
  type LayoutTemplate,
} from '@panelcraft/types';
import type { SupabaseClient } from '@supabase/supabase-js';

interface ComicJobData {
  projectId: string;
  selectedLayout?: string;
  panelIndex?: number;
  feedback?: {
    approved: boolean;
    comment?: string;
    regenerationHint?: string;
  };
  /**
   * Optional reviewer feedback supplied when regenerating a single panel
   * out-of-graph (Edit panel dialog). Distinct from the HITL `feedback`
   * field above which carries the full review payload.
   */
  regenFeedback?: string;
  /**
   * Composition flavor forwarded to the final-page adapter when running
   * `compose-final-page`. Defaults to `composite-true` when omitted.
   */
  composeFlavor?: 'composite-true' | 'repaint';
}

interface CharacterBibleEntry {
  name?: string;
  visual?: string;
  consistency?: string;
}

/**
 * Build the prompt modifiers passed to imageGenPort.generatePanel.
 * Mirrors `buildCharacterStyleModifiers` inside the graph node so that
 * out-of-graph regeneration produces visually consistent panels.
 */
function buildStyleModifiers(project: ComicProject): string | undefined {
  const json = project.toJSON();
  const parts: string[] = [];
  if (json.styleReferences?.globalStylePrompt) {
    parts.push(json.styleReferences.globalStylePrompt);
  }
  const bible = json.characterBible as
    | { characters?: CharacterBibleEntry[] }
    | null
    | undefined;
  if (bible?.characters?.length) {
    const charDesc = bible.characters
      .map((c) => `${c.name}: ${c.visual}. ${c.consistency}`)
      .join('. ');
    parts.push(`Character consistency — ${charDesc}`);
  }
  return parts.length ? parts.join('. ') : undefined;
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
  supabase: SupabaseClient,
  imageGenPort: ImageGenerationPort,
  llmClient: LLMClientPort,
  imageCompositionPort: ImageCompositionPort | null
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
        } else if (job.name === 'regenerate-panel') {
          // Regeneration of a single panel after the project has already
          // completed (or while it's mid-review). We bypass LangGraph
          // entirely here — the graph's HITL loop assumes sequential
          // generation, and re-entering it for a one-off panel rework
          // would require resetting the checkpoint. A direct call to
          // imageGenPort is simpler and matches what the graph node does.
          const { panelIndex, regenFeedback } = job.data;
          if (typeof panelIndex !== 'number') {
            throw new Error('[Worker] regenerate-panel job missing panelIndex');
          }
          const panels = project.getPanels();
          const targetPanel = panels[panelIndex];
          if (!targetPanel) {
            throw new Error(
              `[Worker] Panel ${panelIndex} not found on project ${projectId}`
            );
          }
          const basePrompt = targetPanel.getPrompt()?.trim();
          if (!basePrompt) {
            throw new Error(
              `[Worker] Panel ${panelIndex} has no prompt; cannot regenerate`
            );
          }
          // Append optional reviewer feedback for this regen only; the
          // persisted panel prompt is unchanged so subsequent regens revert
          // to the original direction unless new feedback is supplied.
          const feedbackText =
            typeof regenFeedback === 'string' && regenFeedback.trim().length > 0
              ? regenFeedback.trim()
              : null;
          const prompt = feedbackText
            ? `${basePrompt}\n\nReviewer feedback for this regeneration: ${feedbackText}`
            : basePrompt;

          logger.info(
            `[Worker] Regenerating panel ${panelIndex} for project ${projectId}${
              feedbackText ? ' with feedback' : ''
            }`
          );

          const styleModifiers = buildStyleModifiers(project);
          let referenceImageUrls: string[] | undefined;
          const coverPath = project.getCoverImageUrl();
          if (coverPath && !/^https?:\/\//i.test(coverPath)) {
            try {
              const { data: signedUrlData } = await supabase.storage
                .from('comics')
                .createSignedUrl(coverPath, 3600);
              if (signedUrlData?.signedUrl) {
                referenceImageUrls = [signedUrlData.signedUrl];
              }
            } catch (err) {
              logger.warn(
                `[Worker] Failed to sign cover for regen reference: ${err instanceof Error ? err.message : String(err)}`
              );
            }
          }

          const remoteUrl = await imageGenPort.generatePanel({
            prompt,
            panelNumber: panelIndex + 1,
            styleModifiers,
            referenceImageUrls,
          });

          // Persist the regenerated image to Supabase so the URL doesn't
          // expire and CORS-dependent features (PNG export) keep working.
          const storagePath = `comics/${projectId}/panels/${panelIndex}.webp`;
          let stagedPath = remoteUrl;
          try {
            const imageResponse = await fetch(remoteUrl);
            if (!imageResponse.ok) {
              throw new Error(
                `Failed to fetch regenerated panel from CDN: HTTP ${imageResponse.status}`
              );
            }
            const buffer = Buffer.from(await imageResponse.arrayBuffer());
            const { error: uploadError } = await supabase.storage
              .from('comics')
              .upload(storagePath, buffer, {
                contentType: 'image/webp',
                upsert: true,
              });
            if (uploadError) throw uploadError;
            stagedPath = storagePath;
          } catch (err) {
            logger.warn(
              `[Worker] Regenerated panel ${panelIndex} stage-to-Supabase failed; ` +
                `falling back to remote URL: ${err instanceof Error ? err.message : String(err)}`
            );
          }

          targetPanel.setGeneratedImageUrl(stagedPath);
          const completedStatus = PanelStatus.create('completed');
          if (!completedStatus.success || !completedStatus.value) {
            throw new Error('Failed to construct completed PanelStatus');
          }
          targetPanel.setStatus(completedStatus.value);
          project.setPanels(panels);

          const rawPanelCount = project.getPanelCount();
          const panelCountValue =
            typeof rawPanelCount === 'number'
              ? rawPanelCount
              : rawPanelCount.getValue();
          const completedCount = panels.filter(
            (p) => p.getStatus().getValue() === 'completed'
          ).length;
          project.setStatus(
            completedCount >= panelCountValue ? 'completed' : 'pending_review'
          );
          await projectRepo.save(project);

          logger.info(
            `[Worker] Panel ${panelIndex} regenerated; project status set to ` +
              `${project.getStatus()}`
          );
        } else if (job.name === 'regenerate-cover') {
          // Out-of-graph cover regeneration. The handler validates that the
          // project is `completed` and flips status to `processing` before
          // enqueue; here we render a new cover image with the same
          // prompt/style/character bible as the original (plus optional
          // reviewer feedback), upload it to the same storage path so
          // existing signed URLs keep working, and restore status to
          // `completed` so the polling UI settles.
          const { regenFeedback } = job.data;
          const feedbackText =
            typeof regenFeedback === 'string' && regenFeedback.trim().length > 0
              ? regenFeedback.trim()
              : undefined;

          logger.info(
            `[Worker] Regenerating cover for project ${projectId}` +
              (feedbackText ? ' with feedback' : '')
          );

          const coverBuffer = await imageGenPort.generateCover({
            prompt: project.getPrompt().getValue(),
            style: project.getStyleReferences() ?? undefined,
            characterBible: project.getCharacterBible()?.getValue() ?? null,
            regenFeedback: feedbackText,
          });

          // Mirror the in-graph cover path so a single storage location
          // owns the cover for the project's whole lifecycle.
          const storagePath = `comics/${projectId}/covers/front.webp`;
          const { error: uploadError } = await supabase.storage
            .from('comics')
            .upload(storagePath, coverBuffer, {
              contentType: 'image/webp',
              upsert: true,
            });
          if (uploadError) {
            throw new Error(
              `[Worker] Failed to upload regenerated cover: ${uploadError.message}`
            );
          }

          project.setCoverImageUrl(storagePath);
          project.setStatus(PENDING_REVIEW_COVER_STATUS);
          await projectRepo.save(project);

          logger.info(
            `[Worker] Cover regenerated for project ${projectId}; paused at "${PENDING_REVIEW_COVER_STATUS}" for HITL approval.`
          );
        } else if (job.name === 'extend-next-panel') {
          // Out-of-graph extend pipeline. The project was a completed comic
          // until the user picked a higher-count layout in HITL; we walk
          // through the freshly-added pending slots one at a time, pausing
          // for HITL review on each (status `pending_review_extend`). The
          // LangGraph thread isn't touched — it has already finalized for
          // the original generation.
          const { regenFeedback } = job.data;
          const panels = project.getPanels();
          const nextPendingIndex = panels.findIndex(
            (p) => p.getStatus().getValue() === 'pending'
          );
          if (nextPendingIndex === -1) {
            project.setStatus('completed');
            await projectRepo.save(project);
            logger.info(
              `[Worker] extend-next-panel found no pending panels for project ${projectId}; ` +
                `marking complete.`
            );
            return;
          }
          const targetPanel = panels[nextPendingIndex]!;

          // Lazy prompt fill: when the user just kicked off an extend round
          // every new slot has an empty prompt. Generate the continuation
          // descriptions for them all in one LLM call using the already-
          // approved panels (and any earlier extend-mode approvals) as the
          // anchor context. Subsequent extend-next-panel runs (after the
          // user approves/rejects each panel) reuse the cached prompts.
          const needsPrompts = panels
            .map((p, idx) => ({ idx, p }))
            .filter(
              ({ p }) =>
                p.getStatus().getValue() === 'pending' && !p.getPrompt().trim()
            )
            .map(({ idx }) => idx);

          if (needsPrompts.length > 0) {
            logger.info(
              `[Worker] Filling continuation prompts for ${needsPrompts.length} ` +
                `extension panel(s) on project ${projectId}`
            );
            // Use the panel's ORIGINAL position (1-based) when labeling so
            // the LLM sees "Panel 1, Panel 3, …" if a middle slot is empty —
            // labeling by the filtered-array index would silently renumber
            // and misrepresent story order.
            const completedPrompts = panels
              .map((panel, idx) => ({ panel, idx }))
              .filter(({ panel }) => panel.getPrompt().trim().length > 0)
              .map(({ panel, idx }) => `Panel ${idx + 1}: ${panel.getPrompt()}`)
              .join('\n');
            const storyPrompt = project.getPrompt().getValue();
            const systemPrompt =
              'You are an expert comic writer extending an existing storyboard. ' +
              'You write new panel descriptions that continue the narrative cleanly ' +
              'from the panels already approved by the user.';
            const userPrompt = `Story Concept: "${storyPrompt}"

Existing approved panel descriptions:
${completedPrompts}

Write exactly ${needsPrompts.length} new short visual panel description(s) that continue the story from where the existing panels left off. Each description should be 1-2 sentences, cinematic, focused on visuals and composition. Every new panel MUST include at least one speech bubble, thought bubble, or narration caption (write the line in double quotes and follow with a parenthetical of the bubble type, e.g. (speech bubble from Mira, tail pointing to her)). Keep continuity with the existing characters, mood, and tone.

Return ONLY a valid JSON array of exactly ${needsPrompts.length} string(s) with no markdown or extra formatting.`;
            let llmResponse: unknown;
            try {
              llmResponse = await llmClient.call(systemPrompt, userPrompt);
            } catch (err) {
              throw new Error(
                `[Worker] LLM call failed while generating extend prompts: ` +
                  (err instanceof Error ? err.message : String(err))
              );
            }
            if (!Array.isArray(llmResponse)) {
              throw new Error(
                `[Worker] Expected LLM to return an array of prompts, got ` +
                  typeof llmResponse
              );
            }
            const generatedPrompts = llmResponse as unknown[];
            if (generatedPrompts.length !== needsPrompts.length) {
              throw new Error(
                `[Worker] LLM returned ${generatedPrompts.length} prompts, ` +
                  `expected ${needsPrompts.length}`
              );
            }
            needsPrompts.forEach((panelIdx, i) => {
              const prompt = generatedPrompts[i];
              if (typeof prompt !== 'string' || !prompt.trim()) {
                throw new Error(
                  `[Worker] LLM returned non-string prompt at position ${i}`
                );
              }
              panels[panelIdx]!.setPrompt(prompt);
            });
            project.setPanels(panels);
            await projectRepo.save(project);
          }

          // Now generate the image for the targeted panel. Mirrors the
          // regenerate-panel pipeline (mask of styleModifiers, optional
          // cover reference, Supabase staging) so visual continuity carries
          // over without diverging from the original tooling.
          const basePrompt = targetPanel.getPrompt().trim();
          if (!basePrompt) {
            throw new Error(
              `[Worker] Panel ${nextPendingIndex} still has no prompt after ` +
                `continuation fill — aborting.`
            );
          }
          const feedbackText =
            typeof regenFeedback === 'string' && regenFeedback.trim().length > 0
              ? regenFeedback.trim()
              : null;
          const imagePrompt = feedbackText
            ? `${basePrompt}\n\nReviewer feedback for this regeneration: ${feedbackText}`
            : basePrompt;

          const styleModifiers = buildStyleModifiers(project);
          let referenceImageUrls: string[] | undefined;
          const coverPath = project.getCoverImageUrl();
          if (coverPath && !/^https?:\/\//i.test(coverPath)) {
            try {
              const { data: signedUrlData } = await supabase.storage
                .from('comics')
                .createSignedUrl(coverPath, 3600);
              if (signedUrlData?.signedUrl) {
                referenceImageUrls = [signedUrlData.signedUrl];
              }
            } catch (err) {
              logger.warn(
                `[Worker] Failed to sign cover for extend reference: ` +
                  (err instanceof Error ? err.message : String(err))
              );
            }
          }

          const remoteUrl = await imageGenPort.generatePanel({
            prompt: imagePrompt,
            panelNumber: nextPendingIndex + 1,
            styleModifiers,
            referenceImageUrls,
          });

          const storagePath = `comics/${projectId}/panels/${nextPendingIndex}.webp`;
          let stagedPath = remoteUrl;
          try {
            const imageResponse = await fetch(remoteUrl);
            if (!imageResponse.ok) {
              throw new Error(
                `Failed to fetch extend panel from CDN: HTTP ${imageResponse.status}`
              );
            }
            const buffer = Buffer.from(await imageResponse.arrayBuffer());
            const { error: uploadError } = await supabase.storage
              .from('comics')
              .upload(storagePath, buffer, {
                contentType: 'image/webp',
                upsert: true,
              });
            if (uploadError) throw uploadError;
            stagedPath = storagePath;
          } catch (err) {
            logger.warn(
              `[Worker] Extend panel ${nextPendingIndex} stage-to-Supabase failed; ` +
                `falling back to remote URL: ` +
                (err instanceof Error ? err.message : String(err))
            );
          }

          targetPanel.setGeneratedImageUrl(stagedPath);
          const generatedStatus = PanelStatus.create('generated');
          if (!generatedStatus.success || !generatedStatus.value) {
            throw new Error('Failed to construct generated PanelStatus');
          }
          targetPanel.setStatus(generatedStatus.value);
          project.setPanels(panels);
          project.setStatus(PENDING_REVIEW_EXTEND_STATUS);
          await projectRepo.save(project);

          logger.info(
            `[Worker] Extend panel ${nextPendingIndex} generated; project ${projectId} ` +
              `paused for HITL review.`
          );
        } else if (job.name === 'compose-final-page') {
          // AI-rendered final composition. Runs entirely out-of-graph because
          // the LangGraph thread already finalized for the original
          // generation. We pull each approved panel image as a Buffer, hand
          // them to the composition adapter together with the resolved layout
          // template, and stage the result back to Supabase. The project is
          // left at `pending_review_final` so the user can approve or reject
          // the composite via the existing review endpoint.
          if (!imageCompositionPort) {
            throw new Error(
              `[Worker] compose-final-page job received but no ` +
                `imageCompositionPort is configured (set ` +
                `GOOGLE_GENERATIVE_AI_API_KEY and ` +
                `FEATURE_FINAL_COMPOSITION=true).`
            );
          }
          const { regenFeedback, composeFlavor } = job.data;
          const panels = project.getPanels();
          if (panels.length === 0) {
            throw new Error(
              `[Worker] Project ${projectId} has no panels — cannot compose.`
            );
          }

          // Resolve layout. Fall back to the default 2x2 if the persisted
          // selectedLayout was never set or references a legacy free-form
          // string from before the layout catalog existed.
          const layoutId = project.getSelectedLayout();
          let layoutTemplate: LayoutTemplate | undefined = layoutId
            ? getLayoutById(layoutId)
            : undefined;
          if (!layoutTemplate) {
            logger.warn(
              `[Worker] Project ${projectId} selectedLayout="${layoutId}" ` +
                `not in catalog — falling back to ` +
                `"${DEFAULT_FALLBACK_LAYOUT.id}".`
            );
            layoutTemplate = DEFAULT_FALLBACK_LAYOUT;
          }

          // Fetch each panel image as a Buffer. Generated panels are stored
          // as storage paths once staged, but the original CDN URL is kept
          // as a fallback for panels that failed to stage. Sign storage
          // paths in parallel — most projects have 1-4 panels so this is
          // cheap.
          logger.info(
            `[Worker] Composing final page for project ${projectId} ` +
              `(${panels.length} panel(s), layout="${layoutTemplate.id}")`
          );
          const panelImages: Buffer[] = await Promise.all(
            panels.map(async (panel, idx) => {
              const stored = panel.getGeneratedImageUrl();
              if (!stored) {
                throw new Error(
                  `[Worker] Panel ${idx} on project ${projectId} has no ` +
                    `image URL — cannot compose.`
                );
              }
              let fetchUrl = stored;
              if (!/^https?:\/\//i.test(stored)) {
                const { data: signedUrlData, error: signError } =
                  await supabase.storage
                    .from('comics')
                    .createSignedUrl(stored, 3600);
                if (signError || !signedUrlData?.signedUrl) {
                  throw new Error(
                    `[Worker] Failed to sign panel ${idx} (${stored}): ` +
                      (signError?.message || 'no signed URL returned')
                  );
                }
                fetchUrl = signedUrlData.signedUrl;
              }
              const res = await fetch(fetchUrl);
              if (!res.ok) {
                throw new Error(
                  `[Worker] Failed to fetch panel ${idx}: HTTP ${res.status}`
                );
              }
              return Buffer.from(await res.arrayBuffer());
            })
          );

          const composedBuffer = await imageCompositionPort.composeFinalPage({
            layoutTemplate,
            panelImages,
            // Prompt is built inside the adapter from layoutTemplate +
            // storyPrompt + flavor; pass an empty marker to satisfy the
            // port shape so callers that don't override get the default
            // composition behavior.
            prompt: '',
            storyPrompt: project.getPrompt().getValue(),
            characterBible: project.getCharacterBible()?.getValue() ?? null,
            regenFeedback,
            composeFlavor,
          });

          const composedPath = `comics/${projectId}/composed/final.webp`;
          const { error: uploadError } = await supabase.storage
            .from('comics')
            .upload(composedPath, composedBuffer, {
              contentType: 'image/webp',
              upsert: true,
            });
          if (uploadError) {
            throw new Error(
              `[Worker] Failed to upload composed page: ${uploadError.message}`
            );
          }

          project.setComposedImageUrl(composedPath);
          project.setStatus(PENDING_REVIEW_FINAL_STATUS);
          await projectRepo.save(project);

          logger.info(
            `[Worker] Final composition ready for project ${projectId}; ` +
              `paused at "${PENDING_REVIEW_FINAL_STATUS}".`
          );
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
              if (job.name === 'regenerate-panel') {
                // Regenerate originated from a 'completed' project (the
                // handler rejects other states). The target panel was
                // flipped to 'pending' before enqueue; failing into
                // 'pending_review' would strand it. Mark the panel failed
                // and restore the project to 'completed' so the UI can
                // re-offer regenerate.
                const panelIndex = job.data.panelIndex;
                if (typeof panelIndex === 'number') {
                  const panels = project.getPanels();
                  const target = panels[panelIndex];
                  if (target) {
                    const failedStatus = PanelStatus.create('failed');
                    if (failedStatus.success && failedStatus.value) {
                      target.setStatus(failedStatus.value);
                      project.setPanels(panels);
                    }
                  }
                }
                project.setStatus('completed');
              } else if (job.name === 'extend-next-panel') {
                // Extend pipeline failed. Mark the first pending extend
                // panel as failed so it doesn't block subsequent rounds,
                // and revert the project to its prior settled state so the
                // user can retry the extend from the layout chooser.
                const panels = project.getPanels();
                const firstPending = panels.findIndex(
                  (p) => p.getStatus().getValue() === 'pending'
                );
                if (firstPending !== -1) {
                  const failedStatus = PanelStatus.create('failed');
                  if (failedStatus.success && failedStatus.value) {
                    panels[firstPending]!.setStatus(failedStatus.value);
                    project.setPanels(panels);
                  }
                }
                project.setStatus('completed');
              } else if (job.name === 'compose-final-page') {
                // Composition failed. Keep any previously-composed image
                // around (so /view still has something to show) and drop
                // back to `completed` so the sidebar button re-arms for
                // another attempt.
                project.setStatus('completed');
              } else if (job.name === 'regenerate-cover') {
                // Cover regen failed. Keep the existing cover image
                // around and revert to `completed` so the footer button
                // re-arms.
                project.setStatus('completed');
              } else if (currentStatus === 'processing') {
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
