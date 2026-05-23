import { Panel } from "./Panel.js";
import { ComicProjectId, ComicTitle, PanelCount, CharacterBible } from "../value-objects/index.js";
import { ValidationError } from "../errors/ValidationError.js";

export interface ComicProjectProps {
  prompt: ComicTitle;
  panelCount: PanelCount;
  panels?: Panel[];
  characterBible?: CharacterBible | null;
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

  getStatus(): string {
    return this.status;
  }

  setStatus(status: string): void {
    this.status = status;
  }

  getCreatedAt(): string {
    return this.createdAt;
  }

  getLastReviewSubmittedAt(): string | null {
    return this.lastReviewSubmittedAt;
  }

  setLastReviewSubmittedAt(date: string | null): void {
    this.lastReviewSubmittedAt = date;
  }

  toJSON() {
    return {
      id: this.id.getValue(),
      prompt: this.prompt.getValue(),
      panelCount: this.panelCount.getValue(),
      panels: this.panels.map(p => p.toJSON()),
      characterBible: this.characterBible ? this.characterBible.getValue() : null,
      status: this.status,
      createdAt: this.createdAt,
      lastReviewSubmittedAt: this.lastReviewSubmittedAt,
    };
  }

  static fromJSON(json: any): ComicProject {
    const idResult = ComicProjectId.create(json.id);
    if (!idResult.success) {
      throw new ValidationError(`ComicProject.fromJSON id: ${idResult.error?.message}`);
    }

    const promptResult = ComicTitle.create(json.prompt);
    if (!promptResult.success) {
      throw new ValidationError(`ComicProject.fromJSON prompt: ${promptResult.error?.message}`);
    }

    const panelCountResult = PanelCount.create(json.panelCount);
    if (!panelCountResult.success) {
      throw new ValidationError(`ComicProject.fromJSON panelCount: ${panelCountResult.error?.message}`);
    }

    let characterBible: CharacterBible | null = null;
    if (json.characterBible) {
      const charBibleResult = CharacterBible.create(json.characterBible);
      if (!charBibleResult.success) {
        throw new ValidationError(`ComicProject.fromJSON characterBible: ${charBibleResult.error?.message}`);
      }
      characterBible = charBibleResult.value!;
    }

    return new ComicProject(idResult.value!, {
      prompt: promptResult.value!,
      panelCount: panelCountResult.value!,
      panels: (json.panels || []).map((p: any) => Panel.fromJSON(p)),
      characterBible,
      status: json.status || "pending",
      createdAt: json.createdAt || new Date().toISOString(),
      lastReviewSubmittedAt: json.lastReviewSubmittedAt || null,
    });
  }
}

