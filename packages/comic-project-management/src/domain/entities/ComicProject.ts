import { Panel, PanelJSON } from './Panel.js';
import {
  ComicProjectId,
  ComicTitle,
  PanelCount,
  CharacterBible,
} from '../value-objects/index.js';
import { ValidationError } from '../errors/ValidationError.js';

export interface ComicProjectProps {
  prompt: ComicTitle;
  panelCount: PanelCount;
  panels?: Panel[];
  characterBible?: CharacterBible | null;
  status: string;
  createdAt: string;
  lastReviewSubmittedAt?: string | null;
}

export interface ComicProjectJSON {
  id: string;
  prompt: string;
  panelCount: number;
  panels?: unknown[];
  characterBible?: unknown;
  status: string;
  createdAt: string;
  lastReviewSubmittedAt?: string | null;
}

export class ComicProject {
  private prompt: ComicTitle;
  private panelCount: PanelCount;
  private panels: Panel[];
  private characterBible: CharacterBible | null;
  private status: string;
  private createdAt: string;
  private lastReviewSubmittedAt: string | null;

  constructor(
    private readonly id: ComicProjectId,
    props: ComicProjectProps
  ) {
    this.prompt = props.prompt;
    this.panelCount = props.panelCount;
    this.panels = props.panels || [];
    this.characterBible = props.characterBible || null;
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
    return this.panels;
  }

  setPanels(panels: Panel[]): void {
    this.panels = panels;
  }

  getCharacterBible(): CharacterBible | null {
    return this.characterBible;
  }

  setCharacterBible(bible: CharacterBible | null): void {
    this.characterBible = bible;
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

  /**
   * Serializes the project to a plain JSON object with primitive values.
   * Used at layer boundaries (e.g., API responses, workflow state persistence).
   * Value objects are unwrapped to primitives; entities are recursively serialized.
   */
  toJSON() {
    return {
      id: this.id.getValue(),
      prompt: this.prompt.getValue(),
      panelCount: this.panelCount.getValue(),
      panels: this.panels.map((p) => p.toJSON()),
      characterBible: this.characterBible
        ? this.characterBible.getValue()
        : null,
      status: this.status,
      createdAt: this.createdAt,
      lastReviewSubmittedAt: this.lastReviewSubmittedAt,
    };
  }

  /**
   * Deserializes a plain JSON object back into a ComicProject entity.
   * Reconstructs all value objects and validates their contracts.
   * Throws ValidationError if any field fails to construct.
   * Used to recover typed entities from persistent or serialized state.
   */
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
      status: json.status || 'pending',
      createdAt: json.createdAt || new Date().toISOString(),
      lastReviewSubmittedAt: json.lastReviewSubmittedAt || null,
    });
  }
}
