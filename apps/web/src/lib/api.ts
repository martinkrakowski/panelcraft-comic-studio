import {
  ResponseEnvelope,
  ProjectListResponse,
  ProjectDetailResponse,
  CreateProjectResponse,
  SubmitReviewInput,
  ReviewResponse,
  type CompositionFlavor,
} from '@panelcraft/types';

// Determine default API URL (automatically handles server-side rendering vs client browser execution)
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * Performs a type-safe HTTP fetch request against the PanelCraft API.
 * Wraps results in the standard ResponseEnvelope structure.
 *
 * @template T - The expected return type of the wrapped envelope's data.
 * @param path - Target API endpoint path (e.g. '/api/projects').
 * @param options - Optional HTTP fetch RequestInit options.
 * @returns A promise resolving to the data object of type T inside the envelope.
 * @throws {Error} when the network response status is not ok or envelope.success is false.
 */
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const isFormData = options?.body instanceof FormData;
  const response = await fetch(url, {
    ...options,
    // Send the httpOnly session cookie so the API can authorize the request
    // and scope projects to the signed-in user.
    credentials: 'include',
    headers: {
      // Only set JSON content type if not sending FormData
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options?.headers || {}),
    },
  });

  if (!response.ok) {
    let errorMsg = `HTTP error! Status: ${response.status}`;
    try {
      const errorJson = await response.json();
      if (errorJson?.error?.message) {
        errorMsg = errorJson.error.message;
      }
    } catch {
      // Ignore if body is not JSON
    }
    throw new Error(errorMsg);
  }

  const envelope = (await response.json()) as ResponseEnvelope<T>;
  if (!envelope.success) {
    throw new Error(envelope.error?.message || 'API request failed');
  }

  return envelope.data;
}

/**
 * Port-adapter mapping for project management HTTP API requests.
 */
export const api = {
  /**
   * Retrieves the list of all active comic book projects.
   *
   * @returns A promise that resolves to the ProjectListResponse containing all summaries.
   */
  async getProjects(): Promise<ProjectListResponse> {
    return request<ProjectListResponse>('/api/projects');
  },

  /**
   * Retrieves full details and panel data of a specific comic project by uuid.
   *
   * @param id - The UUID string of the target project.
   * @returns A promise that resolves to the ProjectDetailResponse containing project details.
   */
  async getProject(id: string): Promise<ProjectDetailResponse> {
    return request<ProjectDetailResponse>(`/api/projects/${id}`);
  },

  /**
   * Launches a new comic creation workflow with multipart form data (wizard flow).
   *
   * @param formData - FormData containing all wizard fields and image files.
   * @returns A promise that resolves to the CreateProjectResponse containing new projectId.
   */
  async createProjectMultipart(
    formData: FormData
  ): Promise<CreateProjectResponse> {
    return request<CreateProjectResponse>('/api/projects', {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Selects a layout for a project and resumes the LangGraph workflow.
   *
   * @param id - Project UUID
   * @param layout - Selected layout identifier
   */
  async selectLayout(id: string, layout: string): Promise<void> {
    return request<void>(`/api/projects/${id}/layout`, {
      method: 'POST',
      body: JSON.stringify({ selectedLayout: layout }),
    });
  },

  /**
   * Swap the persisted layout choice without re-running generation. Used in
   * the HITL editor to re-arrange existing panels under a different layout
   * template — project status is preserved.
   */
  async updateLayout(id: string, layout: string): Promise<void> {
    return request<void>(`/api/projects/${id}/layout`, {
      method: 'PATCH',
      body: JSON.stringify({ selectedLayout: layout }),
    });
  },

  /**
   * Add empty panel slots to a completed project and kick off the worker
   * that fills them in one-by-one with HITL pauses. Returns 202; the UI
   * should poll until the worker produces the first new panel in the
   * `pending_review_extend` status.
   */
  async extendPanels(
    id: string,
    targetPanelCount: number,
    layout: string
  ): Promise<{ message: string; targetPanelCount: number }> {
    return request<{ message: string; targetPanelCount: number }>(
      `/api/projects/${id}/panels/extend`,
      {
        method: 'POST',
        body: JSON.stringify({
          targetPanelCount,
          selectedLayout: layout,
        }),
      }
    );
  },

  /**
   * Drop panels from a completed project, keeping only the supplied indices
   * (preserving order). Pure metadata update — no regeneration.
   */
  async shrinkPanels(
    id: string,
    keepIndices: number[],
    layout: string
  ): Promise<void> {
    return request<void>(`/api/projects/${id}/panels/shrink`, {
      method: 'POST',
      body: JSON.stringify({
        keepIndices,
        selectedLayout: layout,
      }),
    });
  },

  /**
   * Retrieves latest project status.
   *
   * @param id - Project UUID
   * @returns Updated project details
   */
  async getProjectStatus(id: string): Promise<ProjectDetailResponse> {
    return request<ProjectDetailResponse>(`/api/projects/${id}`);
  },

  /**
   * Sends a story prompt to the LLM analyzer and receives suggested genres and tones.
   *
   * @param prompt - The user's story prompt (10-1000 chars).
   * @returns Suggested genres and tones plus optional LLM feedback metadata.
   */
  async analyzePrompt(prompt: string): Promise<{
    feedback?: string;
    estimatedCharactersCount?: number;
    suggestedGenres: string[];
    suggestedTones: string[];
  }> {
    return request('/api/wizard/analyze-prompt', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  },

  /**
   * Submits a panel feedback/approval review for the active generator node (HITL).
   *
   * @param id - The UUID string of the target project under review.
   * @param input - The SubmitReviewInput containing approved status and feedback comments.
   * @returns A promise that resolves to the ReviewResponse.
   */
  async submitReview(
    id: string,
    input: SubmitReviewInput
  ): Promise<ReviewResponse> {
    return request<ReviewResponse>(`/api/projects/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  /**
   * Regenerate a single completed panel. The project transitions to
   * `processing` while the worker runs and back to its prior terminal state
   * once the new image is staged. Optional `feedback` is appended to the
   * panel prompt for this regeneration only — it is not persisted on the
   * panel, so subsequent regens revert to the original direction unless new
   * feedback is supplied.
   */
  async regeneratePanel(
    id: string,
    panelIndex: number,
    feedback?: string
  ): Promise<{ message: string }> {
    const body = feedback?.trim()
      ? JSON.stringify({ feedback: feedback.trim() })
      : undefined;
    return request<{ message: string }>(
      `/api/projects/${id}/panels/${panelIndex}/regenerate`,
      { method: 'POST', body }
    );
  },

  /**
   * Permanently delete a project and all associated assets (storage objects,
   * LangGraph checkpoints, DB row). The server returns `{ id, deleted: true }`
   * on full success. On partial cleanup failure (project row gone but some
   * assets couldn't be removed) the request rejects with a non-2xx and the
   * caller should treat the project as deleted from the user's perspective.
   */
  async deleteProject(id: string): Promise<{ id: string; deleted: boolean }> {
    return request<{ id: string; deleted: boolean }>(`/api/projects/${id}`, {
      method: 'DELETE',
    });
  },

  /**
   * Queue the AI-rendered final composition pass for a completed project.
   * Returns 202; the project transitions to `composing` and then
   * `pending_review_final` once the worker has produced the composite.
   * Pass `regenFeedback` and `composeFlavor` when re-running after a
   * rejection from the HITL review surface.
   */
  async composeFinalPage(
    id: string,
    options: {
      regenFeedback?: string;
      composeFlavor?: CompositionFlavor;
    } = {}
  ): Promise<{ message: string }> {
    return request<{ message: string }>(`/api/projects/${id}/compose`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  },

  /**
   * Enqueue a fresh cover render for a `completed` project. Optional
   * `feedback` is appended to the cover prompt for this run only — it
   * is not persisted, so the next regen reverts to the original
   * direction unless new feedback is supplied. Returns 202; project
   * status transitions to `processing` while the worker runs and back
   * to `completed` when finished.
   */
  async regenerateCover(
    id: string,
    feedback?: string
  ): Promise<{ message: string }> {
    const body = feedback?.trim()
      ? JSON.stringify({ feedback: feedback.trim() })
      : undefined;
    return request<{ message: string }>(
      `/api/projects/${id}/cover/regenerate`,
      { method: 'POST', body }
    );
  },

  /**
   * Toggle whether a project is shared to all users (owner-only on the API).
   */
  async shareProject(
    id: string,
    shared: boolean
  ): Promise<{ id: string; isShared: boolean }> {
    return request<{ id: string; isShared: boolean }>(
      `/api/projects/${id}/share`,
      { method: 'PATCH', body: JSON.stringify({ shared }) }
    );
  },

  /**
   * One-time recovery of pre-auth comics: claim all ownerless projects for the
   * signed-in user and mark them shared. Returns the count adopted.
   */
  async adoptOrphans(): Promise<{ adopted: number }> {
    return request<{ adopted: number }>('/api/projects/adopt-orphans', {
      method: 'POST',
    });
  },
};
export default api;
