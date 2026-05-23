export interface PanelProps {
  prompt?: string;
  status?: string;
  generatedImageUrl?: string;
}

export class Panel {
  private prompt: string;
  private status: string;
  private generatedImageUrl: string;

  constructor(
    private readonly id: string,
    props: PanelProps = {}
  ) {
    this.prompt = props.prompt || "";
    this.status = props.status || "pending";
    this.generatedImageUrl = props.generatedImageUrl || "";
  }

  getId(): string {
    return this.id;
  }

  getPrompt(): string {
    return this.prompt;
  }

  setPrompt(prompt: string): void {
    this.prompt = prompt;
  }

  getStatus(): string {
    return this.status;
  }

  setStatus(status: string): void {
    this.status = status;
  }

  getGeneratedImageUrl(): string {
    return this.generatedImageUrl;
  }

  setGeneratedImageUrl(url: string): void {
    this.generatedImageUrl = url;
  }

  toJSON() {
    return {
      id: this.id,
      prompt: this.prompt,
      status: this.status,
      generatedImageUrl: this.generatedImageUrl,
    };
  }

  static fromJSON(json: any): Panel {
    return new Panel(json.id, {
      prompt: json.prompt,
      status: json.status,
      generatedImageUrl: json.generatedImageUrl,
    });
  }
}

