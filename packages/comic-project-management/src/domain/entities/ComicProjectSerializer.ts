import { Panel, PanelJSON } from './Panel.js';
import {
  ComicProjectId,
  ComicTitle,
  PanelCount,
  CharacterBible,
} from '../value-objects/index.js';
import { ValidationError } from '../errors/ValidationError.js';
import { ComicProject } from './ComicProject.js';

export interface ComicProjectJSON {
  id: string;
  prompt: string;
  panelCount: number;
  panels?: PanelJSON[];
  characterBible?: unknown;
  genres?: string[];
  tones?: string[];
  styleReferences?: {
    globalStylePrompt: string;
    moodBoardPreset: string;
    moodBoardImages: string[];
    artDirectionNotes?: string;
  } | null;
  coverImageUrl?: string | null;
  selectedLayout?: string | null;
  layoutOptions?: string[] | null;
  status: string;
  createdAt: string;
  lastReviewSubmittedAt?: string | null;
}

export class ComicProjectSerializer {
  static fromJSON(json: ComicProjectJSON): ComicProject {
    const idResult = ComicProjectId.create(json.id);
    if (!idResult.success) {
      throw new ValidationError(
        `ComicProject.fromJSON id: ${idResult.error?.message}`
      );
    }

    const promptResult = ComicTitle.create(json.prompt);
    if (!promptResult.success) {
      throw new ValidationError(
        `ComicProject.fromJSON prompt: ${promptResult.error?.message}`
      );
    }

    const panelCountResult = PanelCount.create(json.panelCount);
    if (!panelCountResult.success) {
      throw new ValidationError(
        `ComicProject.fromJSON panelCount: ${panelCountResult.error?.message}`
      );
    }

    let characterBible: CharacterBible | null = null;
    if (json.characterBible) {
      const charBibleResult = CharacterBible.create(json.characterBible);
      if (!charBibleResult.success) {
        throw new ValidationError(
          `ComicProject.fromJSON characterBible: ${charBibleResult.error?.message}`
        );
      }
      characterBible = charBibleResult.value!;
    }

    return new ComicProject(idResult.value!, {
      prompt: promptResult.value!,
      panelCount: panelCountResult.value!,
      panels: (json.panels || []).map((p) => Panel.fromJSON(p as PanelJSON)),
      characterBible,
      genres: Array.isArray(json.genres) ? json.genres : [],
      tones: Array.isArray(json.tones) ? json.tones : [],
      styleReferences: json.styleReferences || null,
      coverImageUrl: json.coverImageUrl || null,
      selectedLayout: json.selectedLayout || null,
      layoutOptions: Array.isArray(json.layoutOptions)
        ? json.layoutOptions
        : null,
      status: json.status || 'pending_creation',
      createdAt: json.createdAt || new Date().toISOString(),
      lastReviewSubmittedAt: json.lastReviewSubmittedAt || null,
    });
  }
}
