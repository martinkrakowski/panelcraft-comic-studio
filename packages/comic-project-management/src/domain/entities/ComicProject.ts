import { Panel } from './Panel.js';
import {
  ComicProjectId,
  ComicTitle,
  PanelCount,
  CharacterBible,
} from '../value-objects/index.js';
import type { ComicProjectJSON } from './ComicProjectSerializer.js';
import { ComicProjectSerializer } from './ComicProjectSerializer.js';

export interface ComicProjectProps {
  prompt: ComicTitle;
  panelCount: PanelCount;
  panels?: Panel[];
  characterBible?: CharacterBible | null;
  genres?: string[];
  tones?: string[];
  styleReferences?: {
    globalStylePrompt: string;
    moodBoardPreset: string;
    moodBoardImages: string[];
    artDirectionNotes?: string;
  } | null;
  coverImageUrl?: string | null;
  composedImageUrl?: string | null;
  selectedLayout?: string | null;
  layoutOptions?: string[] | null;
  status: string;
  createdAt: string;
  lastReviewSubmittedAt?: string | null;
}

export type { ComicProjectJSON } from './ComicProjectSerializer.js';

export class ComicProject {
  private prompt: ComicTitle;
  private panelCount: PanelCount;
  private panels: Panel[];
  private characterBible: CharacterBible | null;
  private genres: string[];
  private tones: string[];
  private styleReferences: {
    globalStylePrompt: string;
    moodBoardPreset: string;
    moodBoardImages: string[];
    artDirectionNotes?: string;
  } | null;
  private coverImageUrl: string | null;
  private composedImageUrl: string | null;
  private selectedLayout: string | null;
  private layoutOptions: string[] | null;
  private status: string;
  private createdAt: string;
  private lastReviewSubmittedAt: string | null;

  constructor(
    private readonly id: ComicProjectId,
    props: ComicProjectProps
  ) {
    this.prompt = props.prompt;
    this.panelCount = props.panelCount;
    this.panels = props.panels ? [...props.panels] : [];
    this.characterBible = props.characterBible || null;
    this.genres = props.genres ? [...props.genres] : [];
    this.tones = props.tones ? [...props.tones] : [];
    this.styleReferences = props.styleReferences
      ? {
          ...props.styleReferences,
          moodBoardImages: [...props.styleReferences.moodBoardImages],
        }
      : null;
    this.coverImageUrl = props.coverImageUrl || null;
    this.composedImageUrl = props.composedImageUrl || null;
    this.selectedLayout = props.selectedLayout || null;
    this.layoutOptions = props.layoutOptions ? [...props.layoutOptions] : null;
    this.status = props.status;
    this.createdAt = props.createdAt;
    this.lastReviewSubmittedAt = props.lastReviewSubmittedAt || null;
  }

  getId(): ComicProjectId {
    return this.id;
  }
  getPrompt(): ComicTitle {
    return this.prompt;
  }
  setPrompt(prompt: ComicTitle): void {
    this.prompt = prompt;
  }
  getPanelCount(): PanelCount {
    return this.panelCount;
  }
  setPanelCount(count: PanelCount): void {
    this.panelCount = count;
  }
  getPanels(): Panel[] {
    return [...this.panels];
  }
  setPanels(panels: Panel[]): void {
    this.panels = [...panels];
  }
  getCharacterBible(): CharacterBible | null {
    return this.characterBible;
  }
  setCharacterBible(bible: CharacterBible | null): void {
    this.characterBible = bible;
  }
  getGenres(): string[] {
    return [...this.genres];
  }
  setGenres(genres: string[]): void {
    this.genres = [...genres];
  }
  getTones(): string[] {
    return [...this.tones];
  }
  setTones(tones: string[]): void {
    this.tones = [...tones];
  }

  getStyleReferences(): {
    globalStylePrompt: string;
    moodBoardPreset: string;
    moodBoardImages: string[];
    artDirectionNotes?: string;
  } | null {
    return this.styleReferences
      ? {
          ...this.styleReferences,
          moodBoardImages: [...this.styleReferences.moodBoardImages],
        }
      : null;
  }

  setStyleReferences(
    refs: {
      globalStylePrompt: string;
      moodBoardPreset: string;
      moodBoardImages: string[];
      artDirectionNotes?: string;
    } | null
  ): void {
    this.styleReferences = refs
      ? { ...refs, moodBoardImages: [...refs.moodBoardImages] }
      : null;
  }

  getCoverImageUrl(): string | null {
    return this.coverImageUrl;
  }
  setCoverImageUrl(url: string | null): void {
    this.coverImageUrl = url;
  }
  getComposedImageUrl(): string | null {
    return this.composedImageUrl;
  }
  setComposedImageUrl(url: string | null): void {
    this.composedImageUrl = url;
  }
  getSelectedLayout(): string | null {
    return this.selectedLayout;
  }
  setSelectedLayout(layout: string | null): void {
    this.selectedLayout = layout;
  }
  getLayoutOptions(): string[] | null {
    return this.layoutOptions ? [...this.layoutOptions] : null;
  }
  setLayoutOptions(options: string[] | null): void {
    this.layoutOptions = options ? [...options] : null;
  }

  /** Returns the current workflow status (e.g., 'created', 'pending_review', 'completed'). */
  getStatus(): string {
    return this.status;
  }

  /** Sets the workflow status. Used during comic generation to track workflow progress. */
  setStatus(status: string): void {
    this.status = status;
  }

  /** Returns the timestamp when the project was created (ISO 8601 format). */
  getCreatedAt(): string {
    return this.createdAt;
  }

  /** Returns the timestamp of the last HITL review submission, or null if never reviewed. */
  getLastReviewSubmittedAt(): string | null {
    return this.lastReviewSubmittedAt;
  }

  /** Records when human feedback was submitted for HITL review. Used to track review history. */
  setLastReviewSubmittedAt(date: string | null): void {
    this.lastReviewSubmittedAt = date;
  }

  toJSON(): ComicProjectJSON {
    return {
      id: this.id.getValue(),
      prompt: this.prompt.getValue(),
      panelCount: this.panelCount.getValue(),
      panels: this.panels.map((p) => p.toJSON()),
      characterBible: this.characterBible
        ? this.characterBible.getValue()
        : null,
      genres: this.genres.length > 0 ? [...this.genres] : undefined,
      tones: this.tones.length > 0 ? [...this.tones] : undefined,
      styleReferences: this.styleReferences
        ? {
            ...this.styleReferences,
            moodBoardImages: [...this.styleReferences.moodBoardImages],
          }
        : null,
      coverImageUrl: this.coverImageUrl,
      composedImageUrl: this.composedImageUrl,
      selectedLayout: this.selectedLayout,
      layoutOptions: this.layoutOptions ? [...this.layoutOptions] : null,
      status: this.status,
      createdAt: this.createdAt,
      lastReviewSubmittedAt: this.lastReviewSubmittedAt,
    };
  }

  static fromJSON(json: ComicProjectJSON): ComicProject {
    return ComicProjectSerializer.fromJSON(json);
  }
}
