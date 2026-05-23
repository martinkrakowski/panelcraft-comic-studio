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

export const api = {
  async getProjects(): Promise<ProjectListResponse> {
    return request<ProjectListResponse>("/api/projects");
  },
  
  async getProject(id: string): Promise<ProjectDetailResponse> {
    return request<ProjectDetailResponse>(`/api/projects/${id}`);
  },
  
  async createProject(input: CreateProjectInput): Promise<CreateProjectResponse> {
    return request<CreateProjectResponse>("/api/projects", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  
  async submitReview(id: string, input: SubmitReviewInput): Promise<ReviewResponse> {
    return request<ReviewResponse>(`/api/projects/${id}/review`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
export default api;
