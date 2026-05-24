export interface CharacterValue {
  name: string;
  role: string;
  visual: string;
  traits?: string;
  consistency: string;
}

export interface CharacterBibleValue {
  characters: CharacterValue[];
}

export type PanelStatus = "pending" | "generated" | "completed" | "failed";

export type ProjectStatus = "created" | "processing" | "pending_review" | "completed" | "failed";

export interface PanelDTO {
  id: string;
  index: number;
  status: PanelStatus;
  prompt: string;
  imageUrl: string | null;
}

export interface ComicProjectDTO {
  id: string;
  prompt: string;
  panelCount: number;
  panels: PanelDTO[];
  characterBible: CharacterBibleValue | null;
  status: ProjectStatus;
  createdAt: string;
  lastReviewSubmittedAt?: string | null;
}

export interface CreateProjectInput {
  prompt: string;
  panelCount: number;
  characterBible?: CharacterBibleValue | null;
}

export interface SubmitReviewInput {
  approved: boolean;
  comment?: string;
}

/**
 * Standard API response envelope wrapping all server response payloads.
 * Represents success status, typed data, and optional structured error details.
 */
export interface ResponseEnvelope<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

export interface ProjectListResponse {
  projects: {
    id: string;
    prompt: string;
    panelCount: number;
    status: string;
    createdAt: string;
  }[];
}

export interface ProjectDetailResponse {
  project: ComicProjectDTO;
}

export interface CreateProjectResponse {
  projectId: string;
  status: string;
}

export interface ReviewResponse {
  message: string;
}
