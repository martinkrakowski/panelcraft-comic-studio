import { PanelId, PanelStatus } from '../value-objects/index.js';
import { ValidationError } from '../errors/ValidationError.js';

// Centralized overlay types from the shared kernel (remediation).
import type {
  NormalizedPoint,
  DialogueEntry,
  CaptionEntry,
} from '@panelcraft/shared';

// Note: NormalizedPoint, DialogueEntry, and CaptionEntry are now sourced from
// @panelcraft/shared (see remediation work for type centralization).

export interface PanelProps {
  prompt?: string;
  status: PanelStatus;
  generatedImageUrl?: string | null;
  /** Dialogue bubble data (speech/thought/shout). Optional for compat with legacy Panel constructions. */
  dialogue?: DialogueEntry[];
  /** Caption/narration box data. Optional. */
  captions?: CaptionEntry[];
}

export interface PanelJSON {
  id: string;
  prompt?: string;
  status: string;
  generatedImageUrl?: string | null;
  dialogue?: DialogueEntry[];
  captions?: CaptionEntry[];
}

/**
 * Panel entity (domain layer, comic-project-management bounded context).
 *
 * Responsibilities (hexagonal):
 * - Owns panel prompt (for image gen), status machine, generated image asset URL.
 * - Owns structured creative overlays: dialogue[] and captions[] (the "text is data" principle).
 * - Provides fromJSON/toJSON for persistence boundaries and LangGraph state.
 * - Never contains image gen or UI logic.
 *
 * New in cover-title-dialog: dialogue + captions support (Phase 1 schema).
 *
 * @see AGENTS.md for strict hexagonal rules
 */
export class Panel {
  private prompt: string;
  private status: PanelStatus;
  private generatedImageUrl: string | null;
  private dialogue: DialogueEntry[] = [];
  private captions: CaptionEntry[] = [];

  constructor(
    private readonly id: PanelId,
    props: PanelProps
  ) {
    this.prompt = props.prompt || '';
    this.status = props.status;
    this.generatedImageUrl = props.generatedImageUrl || null;
    this.dialogue = props.dialogue ? [...props.dialogue] : [];
    this.captions = props.captions ? [...props.captions] : [];
  }

  getId(): PanelId {
    return this.id;
  }

  /** Returns the AI prompt used to generate this panel's image. */
  getPrompt(): string {
    return this.prompt;
  }

  /** Sets the panel prompt (e.g., from LLM story structuring). */
  setPrompt(prompt: string): void {
    this.prompt = prompt;
  }

  /** Returns the current status (pending, generated, completed, or failed). */
  getStatus(): PanelStatus {
    return this.status;
  }

  /** Sets the panel status as it progresses through generation/review workflow. */
  setStatus(status: PanelStatus): void {
    this.status = status;
  }

  /** Returns the URL of the generated image, or null if not yet generated. */
  getGeneratedImageUrl(): string | null {
    return this.generatedImageUrl;
  }

  /** Sets the generated image URL after successful image generation. */
  setGeneratedImageUrl(url: string | null): void {
    this.generatedImageUrl = url;
  }

  /** Returns a defensive copy of the dialogue entries (bubbles) for this panel. */
  getDialogue(): DialogueEntry[] {
    return [...this.dialogue];
  }

  /** Replaces all dialogue entries (used by editor flows and deserialization). */
  setDialogue(entries: DialogueEntry[]): void {
    this.dialogue = [...entries];
  }

  /** Returns a defensive copy of the caption entries for this panel. */
  getCaptions(): CaptionEntry[] {
    return [...this.captions];
  }

  /** Replaces all caption entries. */
  setCaptions(entries: CaptionEntry[]): void {
    this.captions = [...entries];
  }

  /**
   * Serializes the panel to a plain JSON object with primitive values.
   * Includes dialogue[] and captions[] (added for cover-title-dialogue feature).
   * Used at layer boundaries (e.g., API responses, workflow state persistence, Supabase JSON column).
   */
  toJSON() {
    return {
      id: this.id.getValue(),
      prompt: this.prompt,
      status: this.status.getValue(),
      generatedImageUrl: this.generatedImageUrl,
      dialogue: this.dialogue,
      captions: this.captions,
    };
  }

  /**
   * Deserializes a plain JSON object back into a Panel entity.
   * Reconstructs all value objects and validates their contracts.
   * Handles optional dialogue/captions for backward compatibility with existing persisted projects.
   * Throws ValidationError if any field fails to construct.
   */
  static fromJSON(json: PanelJSON): Panel {
    const idResult = PanelId.create(json.id);
    if (!idResult.success) {
      throw new ValidationError(`Panel.fromJSON: ${idResult.error?.message}`);
    }

    const statusResult = PanelStatus.create(json.status || 'pending');
    if (!statusResult.success) {
      throw new ValidationError(
        `Panel.fromJSON: ${statusResult.error?.message}`
      );
    }

    return new Panel(idResult.value!, {
      prompt: json.prompt,
      status: statusResult.value!,
      generatedImageUrl: json.generatedImageUrl || null,
      dialogue: json.dialogue,
      captions: json.captions,
    });
  }
}
