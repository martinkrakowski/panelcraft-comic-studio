import { Panel } from "./Panel.js";

export interface ComicProjectProps {
  prompt: string;
  panelCount: number;
  panels?: Panel[];
  characterBible?: any;
}

export class ComicProject {
  private prompt: string;
  private panelCount: number;
  private panels: Panel[];
  private characterBible: any;

  constructor(
    private readonly id: string,
    props: ComicProjectProps
  ) {
    this.prompt = props.prompt;
    this.panelCount = props.panelCount;
    this.panels = props.panels || [];
    this.characterBible = props.characterBible || null;
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

  getPanelCount(): number {
    return this.panelCount;
  }

  setPanelCount(count: number): void {
    this.panelCount = count;
  }

  getPanels(): Panel[] {
    return this.panels;
  }

  setPanels(panels: Panel[]): void {
    this.panels = panels;
  }

  getCharacterBible(): any {
    return this.characterBible;
  }

  setCharacterBible(bible: any): void {
    this.characterBible = bible;
  }

  toJSON() {
    return {
      id: this.id,
      prompt: this.prompt,
      panelCount: this.panelCount,
      panels: this.panels.map(p => p.toJSON()),
      characterBible: this.characterBible,
    };
  }

  static fromJSON(json: any): ComicProject {
    return new ComicProject(json.id, {
      prompt: json.prompt,
      panelCount: json.panelCount,
      panels: (json.panels || []).map((p: any) => Panel.fromJSON(p)),
      characterBible: json.characterBible,
    });
  }
}

