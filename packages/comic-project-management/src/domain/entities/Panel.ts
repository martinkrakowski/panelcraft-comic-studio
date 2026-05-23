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

  getPrompt(): string {
    return this.prompt;
  }

  setPrompt(prompt: string): void {
    this.prompt = prompt;
  }

  getStatus(): PanelStatus {
    return this.status;
  }

  setStatus(status: PanelStatus): void {
    this.status = status;
  }

  getGeneratedImageUrl(): string | null {
    return this.generatedImageUrl;
  }

  setGeneratedImageUrl(url: string | null): void {
    this.generatedImageUrl = url;
  }

  toJSON() {
    return {
      id: this.id.getValue(),
      prompt: this.prompt,
      status: this.status.getValue(),
      generatedImageUrl: this.generatedImageUrl,
    };
  }

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

