import { interrupt } from '@langchain/langgraph';
import {
  ComicProject,
  type PanelJSON,
} from '@panelcraft/comic-project-management';
import type { ComicGraphStateType } from '../types/ComicGraphState.js';
import type { HITLFeedbackData } from '../../domain/value-objects/HITLFeedback.vo.js';
import type { WorkflowDeps, CharacterBibleData } from './ComicWorkflowTypes.js';

function buildCharacterStyleModifiers(
  state: ComicGraphStateType
): string | undefined {
  const parts: string[] = [];

  if (state.project.styleReferences?.globalStylePrompt) {
    parts.push(state.project.styleReferences.globalStylePrompt);
  }

  const bible = state.project.characterBible as CharacterBibleData | undefined;
  if (bible?.characters?.length) {
    const charDesc = bible.characters
      .map((c) => `${c.name}: ${c.visual}. ${c.consistency}`)
      .join('. ');
    parts.push(`Character consistency — ${charDesc}`);
  }

  return parts.length ? parts.join('. ') : undefined;
}

export async function generateCover(
  state: ComicGraphStateType,
  deps: WorkflowDeps
): Promise<ComicGraphStateType> {
  const { project } = state;
  const projectId = project.id;
  deps.logger.info(`Generating cover for project ${projectId}`);

  try {
    // Prompt hygiene (per design + ImageGenerationPort extension): pass reserveTitleSpace + targetTitle
    // so adapter appends "clean artwork, blank space reserved at top for title overlay, lettering omitted, no text, no title, no speech bubbles, no narration boxes"
    // to the cover prompt. (Panels get the phrase in buildComicPrompt always.)
    // This keeps artwork clean for later SVG/DOM title + dialogue/caption overlays.
    // Title display generation happens in the subsequent `generateDisplayTitle` node (best-effort LLM + fallback).
    const coverBuffer = await deps.imageGenPort.generateCover({
      prompt: project.prompt,
      style: project.styleReferences,
      characterBible: project.characterBible,
      reserveTitleSpace: true,
      targetTitle: undefined, // populated later by title LLM or user edit on displayTitle
    });

    const bucket = 'comics';
    const storagePath = `comics/${projectId}/covers/front.webp`;
    let uploadError: Error | null = null;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const { error } = await deps.supabase.storage
          .from(bucket)
          .upload(storagePath, coverBuffer, {
            contentType: 'image/webp',
            upsert: true,
          });
        if (error) {
          uploadError = error as unknown as Error;
          deps.logger.warn(
            `Cover upload attempt ${attempt} failed: ${error.message}`
          );
          if (attempt < 3)
            await new Promise((r) => setTimeout(r, 1000 * attempt));
        } else {
          uploadError = null;
          break;
        }
      } catch (err) {
        uploadError = err as Error;
        if (attempt < 3)
          await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }

    if (uploadError) throw uploadError;

    return {
      ...state,
      coverImageUrl: storagePath,
      project: { ...project, coverImageUrl: storagePath },
    };
  } catch (error) {
    deps.logger.error(
      `Cover generation failed: ${error instanceof Error ? error.message : String(error)}`
    );
    const proj = ComicProject.fromJSON(state.project);
    proj.setStatus('failed');
    await deps.projectRepo.save(proj);
    throw error;
  }
}

/**
 * Separate lightweight title LLM generation node.
 *
 * Placed after `generateCover` (best-effort, non-blocking). Uses the existing
 * `LLMClientPort` (wired to XaiLLMClientAdapter / Grok) for a cheap, fast call
 * to produce a short punchy comic display title (3-8 words ideal).
 *
 * - On success: stores string on `project.displayTitle` (sanitized length).
 * - On any failure (LLM error, parse, validation): falls back to a cleaned
 *   truncation of the original user prompt (first ~60 chars + ellipsis).
 * - Never throws; title generation is a presentation concern, not core workflow.
 * - Prompt includes premise + optional genres/tones for relevance.
 * - JSDoc + logging per AGENTS.md and design (COVER-TITLE-IMPLEMENTATION-DESIGN-2026-05.md).
 *
 * The result flows through state → ComicProjectSerializer (validates via VO on load)
 * → API DTO → UI (CoverSlide, headers, editor). User can later override via editor.
 */
export async function generateDisplayTitle(
  state: ComicGraphStateType,
  deps: WorkflowDeps
): Promise<ComicGraphStateType> {
  const { project } = state;
  const projectId = project.id;
  deps.logger.info(`[TitleNode] Generating display title for project ${projectId} (best-effort)`);

  let displayTitle: string | null = null;

  try {
    const systemPrompt =
      'You are a comic book title expert. Create a short, memorable, punchy title (3-8 words max, prefer title case) for the comic book. ' +
      'Return ONLY valid minified JSON: {"title":"The Exact Title Here"}. No prose, no backticks, no extra keys or explanation.';

    const premise = typeof project.prompt === 'string' ? project.prompt : '';
    const genres = Array.isArray(project.genres) ? project.genres.join(', ') : 'unspecified';
    const tones = Array.isArray(project.tones) ? project.tones.join(', ') : 'unspecified';

    const userPrompt = `Premise / Story Prompt:\n${premise}\n\n` +
      `Genre hints: ${genres}\nTone hints: ${tones}\n\n` +
      'Produce the title now.';

    const raw = await deps.llmClient.call(systemPrompt, userPrompt);
    // Flexible extraction: support common response shapes from the LLM adapter
    let candidate: unknown = (raw as Record<string, unknown>)?.title;
    if (!candidate && typeof raw === 'string') {
      candidate = raw;
    }
    if (!candidate && (raw as Record<string, unknown>)?.result) {
      candidate = (raw as Record<string, unknown>).result;
    }

    if (typeof candidate === 'string') {
      const trimmed = candidate.trim().replace(/^["']|["']$/g, '').slice(0, 120);
      if (trimmed.length >= 3) {
        displayTitle = trimmed;
        deps.logger.info(`[TitleNode] LLM succeeded with title: "${displayTitle}"`);
      } else {
        throw new Error('LLM title too short after trim');
      }
    } else {
      throw new Error('LLM response did not contain usable title string');
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    deps.logger.warn(`[TitleNode] LLM title generation failed for ${projectId} (will fallback): ${msg}`);
    // Best-effort truncate fallback from prompt (cleaned + title-cased-ish)
    const promptStr = (typeof project.prompt === 'string' ? project.prompt : '').replace(/\s+/g, ' ').trim();
    if (promptStr.length > 0) {
      let fb = promptStr.length > 60 ? promptStr.slice(0, 57).trim() + '…' : promptStr;
      // Light title-ification
      fb = fb
        .split(/\s+/)
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : ''))
        .join(' ')
        .slice(0, 120);
      if (fb.length >= 3) {
        displayTitle = fb;
      }
    }
  }

  const updatedProject = {
    ...project,
    displayTitle: displayTitle || null,
  };

  return {
    ...state,
    project: updatedProject,
  };
}

export async function suggestLayouts(
  state: ComicGraphStateType,
  deps: WorkflowDeps
): Promise<ComicGraphStateType> {
  deps.logger.info('Generating layout options');
  const layouts = [
    '3-panel grid (1x3)',
    '2-column vertical strip',
    'Full-page splash with 2 insets',
    '4-panel 2x2 grid',
    '1 large panel + 3 thumbnails',
    'Horizontal 6-panel strip',
  ].slice(0, 4 + Math.floor(Math.random() * 3));

  return { ...state, layoutOptions: layouts };
}

export async function layoutInterrupt(
  state: ComicGraphStateType,
  deps: WorkflowDeps
): Promise<ComicGraphStateType> {
  // Selection already in state (e.g. checkpoint already advanced past this
  // node in a previous run); nothing to do.
  if (state.selectedLayout) {
    deps.logger.info(
      `Layout already selected (${state.selectedLayout}), skipping interrupt`
    );
    return state;
  }

  deps.logger.info('Pausing for layout selection');

  let coverImageUrl = '';
  if (state.coverImageUrl) {
    try {
      const { data: signedUrlData } = await deps.supabase.storage
        .from('comics')
        .createSignedUrl(state.coverImageUrl, 3600);
      if (signedUrlData?.signedUrl) {
        coverImageUrl = signedUrlData.signedUrl;
      }
    } catch (err) {
      deps.logger.warn(
        `Failed to generate signed URL for layout preview: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  // interrupt() throws GraphInterrupt on first hit and is resumed by the
  // worker invoking with `new Command({ resume: { selectedLayout } })`.
  // Subsequent interrupt() calls in later nodes will not re-consume this
  // resume value because consumeNullResume() removes it after the first use.
  const selection = interrupt({
    type: 'layout_selection',
    coverImageUrl,
    layoutOptions: state.layoutOptions,
    message: 'Select layout for Page 1',
  }) as { selectedLayout: string };

  return { ...state, selectedLayout: selection.selectedLayout };
}

export async function generatePanel(
  state: ComicGraphStateType,
  deps: WorkflowDeps
): Promise<ComicGraphStateType> {
  const panelIndex = state.currentPanelIndex;
  const panels = state.project.panels || [];
  const panel = panels[panelIndex] as unknown;

  if (!panel || typeof panel !== 'object') {
    throw new Error(`Panel at index ${panelIndex} not found`);
  }

  const panelObj = panel as { prompt?: string };
  const prompt = panelObj.prompt?.trim();

  if (!prompt) {
    throw new Error(
      `[generatePanel] Panel ${panelIndex} has empty prompt. ` +
        'Cannot generate image without a valid prompt description.'
    );
  }

  const styleModifiers = buildCharacterStyleModifiers(state);

  let referenceImageUrls: string[] | undefined;
  if (state.coverImageUrl) {
    try {
      const { data: signedUrlData } = await deps.supabase.storage
        .from('comics')
        .createSignedUrl(state.coverImageUrl, 3600);
      if (signedUrlData?.signedUrl) {
        referenceImageUrls = [signedUrlData.signedUrl];
      }
    } catch (err) {
      deps.logger.warn(
        `Failed to generate fresh signed URL for reference image: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  const remoteImageUrl = await deps.imageGenPort.generatePanel({
    prompt,
    panelNumber: panelIndex + 1,
    styleModifiers,
    referenceImageUrls,
  });

  // Stage the generated panel in Supabase Storage so we own its URL forever
  // (xAI returns short-lived signed URLs) and so the page exporter can read
  // pixels back from canvas — Supabase serves CORS headers, the xAI CDN
  // doesn't. Errors here surface as panel regenerations rather than data loss.
  const projectId = state.project.id;
  const storagePath = `comics/${projectId}/panels/${panelIndex}.webp`;
  let stagedPath = remoteImageUrl;
  try {
    const imageResponse = await fetch(remoteImageUrl);
    if (!imageResponse.ok) {
      throw new Error(
        `Failed to fetch generated panel from CDN: HTTP ${imageResponse.status}`
      );
    }
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    const { error: uploadError } = await deps.supabase.storage
      .from('comics')
      .upload(storagePath, imageBuffer, {
        contentType: 'image/webp',
        upsert: true,
      });
    if (uploadError) throw uploadError;
    stagedPath = storagePath;
  } catch (err) {
    deps.logger.warn(
      `Panel ${panelIndex} stage-to-Supabase failed; falling back to remote URL: ` +
        `${err instanceof Error ? err.message : String(err)}`
    );
  }

  const updatedPanels = [...panels];
  // Harden preservation (cover-title-dialog regen safety): the spread of PanelJSON
  // (which now includes dialogue[] / captions[] from schema work) + explicit copy of
  // any creative fields guarantees they survive image regen in-graph. displayTitle
  // lives at project root and is carried by the outer { ...state.project }.
  // Contract: this node + worker regen path + entity setters MUST never drop creative text data.
  updatedPanels[panelIndex] = {
    ...(panel as PanelJSON),
    generatedImageUrl: stagedPath,
    status: 'generated',
    // Explicit re-assertion for static analysis / future-proofing (fields are in spread)
    dialogue: (panel as any).dialogue,
    captions: (panel as any).captions,
  };

  return {
    ...state,
    project: { ...state.project, panels: updatedPanels },
    currentPanelIndex: panelIndex + 1,
  };
}

export async function hitlReview(
  state: ComicGraphStateType,
  deps: WorkflowDeps
): Promise<ComicGraphStateType> {
  const reviewPanelIndex = state.currentPanelIndex - 1;
  const panels = state.project.panels || [];

  // interrupt() throws GraphInterrupt on first hit. On resume via
  // `new Command({ resume: feedback })` it returns the feedback value here.
  // In the in-graph loop, this node runs once per panel: the *first*
  // hitlReview call within a single invoke is the one consumed by Command's
  // resume; later calls (after another generatePanel) will throw again
  // because consumeNullResume() removes the resume after first use.
  const feedback = interrupt({
    panelIndex: reviewPanelIndex,
    panel: panels[reviewPanelIndex],
    message: 'Review generated panel and provide feedback',
  }) as HITLFeedbackData;

  deps.logger.info(
    `Applying HITL feedback for panel ${reviewPanelIndex} (approved: ${feedback.approved})`
  );

  const updatedPanels = [...panels];
  if (reviewPanelIndex >= 0 && updatedPanels[reviewPanelIndex]) {
    updatedPanels[reviewPanelIndex] = {
      ...(updatedPanels[reviewPanelIndex] as PanelJSON),
      status: feedback.approved ? 'completed' : 'pending',
    };
  }

  const newIndex = feedback.approved
    ? state.currentPanelIndex
    : state.currentPanelIndex - 1;

  return {
    ...state,
    project: { ...state.project, panels: updatedPanels },
    lastFeedback: feedback,
    currentPanelIndex: newIndex,
  };
}

export async function finalizeComic(
  state: ComicGraphStateType,
  deps: WorkflowDeps
): Promise<ComicGraphStateType> {
  deps.logger.info('Finalizing comic project...');
  const project = ComicProject.fromJSON(state.project);
  await deps.projectRepo.save(project);
  return state;
}
