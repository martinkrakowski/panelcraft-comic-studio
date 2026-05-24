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
