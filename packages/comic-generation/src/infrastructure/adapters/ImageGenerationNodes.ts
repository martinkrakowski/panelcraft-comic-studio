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
    const coverBuffer = await deps.imageGenPort.generateCover({
      prompt: project.prompt,
      style: project.styleReferences,
      characterBible: project.characterBible,
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

  const imageUrl = await deps.imageGenPort.generatePanel({
    prompt,
    panelNumber: panelIndex + 1,
    styleModifiers,
    referenceImageUrls,
  });

  const updatedPanels = [...panels];
  updatedPanels[panelIndex] = {
    ...(panel as PanelJSON),
    generatedImageUrl: imageUrl,
    status: 'generated',
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
