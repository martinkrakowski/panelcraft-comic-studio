import { PanelId, PanelStatus } from "../value-objects/index.js";
import { ValidationError } from "../errors/ValidationError.js";

export interface PanelProps {
  prompt?: string;
  status: PanelStatus;
  generatedImageUrl?: string | null;
}

export class Panel {
  private prompt: string;
  private status: PanelStatus;
  private generatedImageUrl: string | null;

  constructor(
    private readonly id: PanelId,
    props: PanelProps
  ) {
    this.prompt = props.prompt || "";
    this.status = props.status;
    this.generatedImageUrl = props.generatedImageUrl || null;
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

  /**
   * Serializes the panel to a plain JSON object with primitive values.
   * Used at layer boundaries (e.g., API responses, workflow state persistence).
   */
  toJSON() {
    return {
      id: this.id.getValue(),
      prompt: this.prompt,
      status: this.status.getValue(),
      generatedImageUrl: this.generatedImageUrl,
    };
  }

  /**
   * Deserializes a plain JSON object back into a Panel entity.
   * Reconstructs all value objects and validates their contracts.
   * Throws ValidationError if any field fails to construct.
   */
  static fromJSON(json: any): Panel {
    const idResult = PanelId.create(json.id);
    if (!idResult.success) {
      throw new ValidationError(`Panel.fromJSON: ${idResult.error?.message}`);
    }

    const statusResult = PanelStatus.create(json.status || "pending");
    if (!statusResult.success) {
      throw new ValidationError(`Panel.fromJSON: ${statusResult.error?.message}`);
    }

    return new Panel(idResult.value!, {
      prompt: json.prompt,
      status: statusResult.value!,
      generatedImageUrl: json.generatedImageUrl || null,
    });
  }
}

