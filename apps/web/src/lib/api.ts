import {
  ResponseEnvelope,
  ProjectListResponse,
  ProjectDetailResponse,
  CreateProjectResponse,
  CreateProjectInput,
  SubmitReviewInput,
  ReviewResponse,
} from "@panelcraft/types";

// Determine default API URL (automatically handles server-side rendering vs client browser execution)
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

/**
 * Performs a type-safe HTTP fetch request against the PanelCraft API.
 * Wraps results in the standard ResponseEnvelope structure.
 * 
 * @param path - Target API endpoint path (e.g. '/api/projects').
 * @param options - Optional HTTP fetch RequestInit options.
 * @throws Error when network response fails or Envelope success is false.
 */
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
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
    } catch (_) {
      // Ignore if body is not JSON
    }
    throw new Error(errorMsg);
  }

  const envelope = (await response.json()) as ResponseEnvelope<T>;
  if (!envelope.success) {
    throw new Error(envelope.error?.message || "API request failed");
  }

  return envelope.data;
}

/**
 * Port-adapter mapping for project management HTTP API requests.
 */
export const api = {
  /**
   * Retrieves the list of all active comic book projects.
   */
  async getProjects(): Promise<ProjectListResponse> {
    return request<ProjectListResponse>("/api/projects");
  },
  
  /**
   * Retrieves full details and panel data of a specific comic project by uuid.
   */
  async getProject(id: string): Promise<ProjectDetailResponse> {
    return request<ProjectDetailResponse>(`/api/projects/${id}`);
  },
  
  /**
   * Launches a new comic creation workflow in the background.
   */
  async createProject(input: CreateProjectInput): Promise<CreateProjectResponse> {
    return request<CreateProjectResponse>("/api/projects", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  
  /**
   * Submits a panel feedback/approval review for the active generator node (HITL).
   */
  async submitReview(id: string, input: SubmitReviewInput): Promise<ReviewResponse> {
    return request<ReviewResponse>(`/api/projects/${id}/review`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
export default api;
