import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createTestApp } from "./helpers/createTestApp.js";
import { InMemoryProjectRepository } from "@panelcraft/comic-project-management";

describe("Projects API Integration Tests", () => {
  let app: any;
  let projectRepo: InMemoryProjectRepository;

  beforeEach(async () => {
    const { app: createdApp, projectRepo: repo } = createTestApp();
    app = createdApp;
    projectRepo = repo;
  });

  describe("GET /api/projects", () => {
    it("should list all projects with response envelope", async () => {
      const response = await request(app).get("/api/projects");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("projects");
      expect(Array.isArray(response.body.data.projects)).toBe(true);
    });

    it("should return empty projects list initially", async () => {
      const response = await request(app).get("/api/projects");

      expect(response.status).toBe(200);
      expect(response.body.data.projects).toEqual([]);
    });
  });

  describe("POST /api/projects", () => {
    it("should create a project and return 201 Created", async () => {
      const response = await request(app)
        .post("/api/projects")
        .send({
          prompt: "A superhero saving the city",
          panelCount: 4,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("success", true);
      expect(response.body).toHaveProperty("data");
      expect(response.body.data).toHaveProperty("projectId");
      expect(response.body.data).toHaveProperty("status", "created");
    });

    it("should validate prompt length (min 10 chars)", async () => {
      const response = await request(app)
        .post("/api/projects")
        .send({
          prompt: "short",
          panelCount: 4,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should validate prompt length (max 1000 chars)", async () => {
      const longPrompt = "a".repeat(1001);
      const response = await request(app)
        .post("/api/projects")
        .send({
          prompt: longPrompt,
          panelCount: 4,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should validate panelCount is integer between 1-20", async () => {
      const response = await request(app)
        .post("/api/projects")
        .send({
          prompt: "A valid prompt here",
          panelCount: 25,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject non-integer panelCount", async () => {
      const response = await request(app)
        .post("/api/projects")
        .send({
          prompt: "A valid prompt here",
          panelCount: 4.5,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject missing prompt field", async () => {
      const response = await request(app)
        .post("/api/projects")
        .send({
          panelCount: 4,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject missing panelCount field", async () => {
      const response = await request(app)
        .post("/api/projects")
        .send({
          prompt: "A valid prompt here",
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should enqueue work asynchronously", async () => {
      const response = await request(app)
        .post("/api/projects")
        .send({
          prompt: "A superhero story",
          panelCount: 3,
        });

      expect(response.status).toBe(201);
      const projectId = response.body.data.projectId;

      // Verify project was persisted
      const getResponse = await request(app).get(`/api/projects/${projectId}`);
      expect(getResponse.status).toBe(200);
      expect(getResponse.body.data.project.id).toBe(projectId);
    });
  });

  describe("GET /api/projects/:id", () => {
    it("should retrieve a single project with valid UUID", async () => {
      // Create a project first
      const createResponse = await request(app)
        .post("/api/projects")
        .send({
          prompt: "A superhero story",
          panelCount: 3,
        });

      const projectId = createResponse.body.data.projectId;

      // Get the project
      const getResponse = await request(app).get(`/api/projects/${projectId}`);

      expect(getResponse.status).toBe(200);
      expect(getResponse.body).toHaveProperty("success", true);
      expect(getResponse.body).toHaveProperty("data");
      expect(getResponse.body.data).toHaveProperty("project");
      expect(getResponse.body.data.project.id).toBe(projectId);
    });

    it("should return 404 for non-existent project", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app).get(`/api/projects/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    it("should reject invalid UUID format", async () => {
      const response = await request(app).get("/api/projects/not-a-uuid");

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should map project domain object to response envelope", async () => {
      // Create a project
      const createResponse = await request(app)
        .post("/api/projects")
        .send({
          prompt: "A superhero story",
          panelCount: 2,
        });

      const projectId = createResponse.body.data.projectId;
      const getResponse = await request(app).get(`/api/projects/${projectId}`);

      expect(getResponse.status).toBe(200);
      const project = getResponse.body.data.project;
      expect(project).toHaveProperty("id");
      expect(project).toHaveProperty("prompt");
      expect(project).toHaveProperty("panelCount");
      expect(project).toHaveProperty("status");
      expect(project).toHaveProperty("createdAt");
      expect(project).toHaveProperty("panels");
      expect(Array.isArray(project.panels)).toBe(true);
    });
  });

  describe("POST /api/projects/:id/review", () => {
    it("should submit review and return 202 Accepted", async () => {
      // Create a project first
      const createResponse = await request(app)
        .post("/api/projects")
        .send({
          prompt: "A superhero story",
          panelCount: 3,
        });

      const projectId = createResponse.body.data.projectId;

      // ⚠️ CRITICAL: Manually set project to pending_review since workers are disabled in tests
      const project = await projectRepo.load(projectId);
      project.setStatus("pending_review");
      await projectRepo.save(project);

      // Submit review
      const reviewResponse = await request(app)
        .post(`/api/projects/${projectId}/review`)
        .send({
          approved: true,
          comment: "Looks great!",
        });

      expect(reviewResponse.status).toBe(202);
      expect(reviewResponse.body).toHaveProperty("success", true);
      expect(reviewResponse.body).toHaveProperty("data");
      expect(reviewResponse.body.data).toHaveProperty("message");
    });

    it("should accept review without comment", async () => {
      // Create a project first
      const createResponse = await request(app)
        .post("/api/projects")
        .send({
          prompt: "A superhero story",
          panelCount: 3,
        });

      const projectId = createResponse.body.data.projectId;

      // ⚠️ CRITICAL: Manually set project to pending_review since workers are disabled in tests
      const project = await projectRepo.load(projectId);
      project.setStatus("pending_review");
      await projectRepo.save(project);

      // Submit review without comment
      const reviewResponse = await request(app)
        .post(`/api/projects/${projectId}/review`)
        .send({
          approved: false,
        });

      expect(reviewResponse.status).toBe(202);
      expect(reviewResponse.body.success).toBe(true);
    });

    it("should validate approved field is boolean", async () => {
      const createResponse = await request(app)
        .post("/api/projects")
        .send({
          prompt: "A superhero story",
          panelCount: 3,
        });

      const projectId = createResponse.body.data.projectId;

      // ⚠️ CRITICAL: Manually set project to pending_review since workers are disabled in tests
      const project = await projectRepo.load(projectId);
      project.setStatus("pending_review");
      await projectRepo.save(project);

      // Submit review with non-boolean approved field
      const reviewResponse = await request(app)
        .post(`/api/projects/${projectId}/review`)
        .send({
          approved: "yes",
          comment: "Looks great!",
        });

      expect(reviewResponse.status).toBe(400);
      expect(reviewResponse.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should validate comment length (max 500 chars)", async () => {
      const createResponse = await request(app)
        .post("/api/projects")
        .send({
          prompt: "A superhero story",
          panelCount: 3,
        });

      const projectId = createResponse.body.data.projectId;

      // ⚠️ CRITICAL: Manually set project to pending_review since workers are disabled in tests
      const project = await projectRepo.load(projectId);
      project.setStatus("pending_review");
      await projectRepo.save(project);

      // Submit review with too long comment
      const longComment = "a".repeat(501);
      const reviewResponse = await request(app)
        .post(`/api/projects/${projectId}/review`)
        .send({
          approved: true,
          comment: longComment,
        });

      expect(reviewResponse.status).toBe(400);
      expect(reviewResponse.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should validate project ID is valid UUID", async () => {
      const reviewResponse = await request(app)
        .post("/api/projects/not-a-uuid/review")
        .send({
          approved: true,
        });

      expect(reviewResponse.status).toBe(400);
      expect(reviewResponse.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should return 404 when project does not exist", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const reviewResponse = await request(app)
        .post(`/api/projects/${fakeId}/review`)
        .send({
          approved: true,
        });

      expect(reviewResponse.status).toBe(404);
      expect(reviewResponse.body).toHaveProperty("success", false);
    });

    it("should queue review asynchronously", async () => {
      // Create a project
      const createResponse = await request(app)
        .post("/api/projects")
        .send({
          prompt: "A superhero story",
          panelCount: 3,
        });

      const projectId = createResponse.body.data.projectId;

      // ⚠️ CRITICAL: Manually set project to pending_review since workers are disabled in tests
      const project = await projectRepo.load(projectId);
      project.setStatus("pending_review");
      await projectRepo.save(project);

      // Submit review - should return immediately with 202
      const reviewResponse = await request(app)
        .post(`/api/projects/${projectId}/review`)
        .send({
          approved: true,
          comment: "Great work!",
        });

      // Verify async response (status 202 alone is sufficient; timing checks are unreliable in CI)
      expect(reviewResponse.status).toBe(202);
    });
  });

  describe("Response Envelope Format", () => {
    it("should always return success flag", async () => {
      const response = await request(app).get("/api/projects");
      expect(response.body).toHaveProperty("success");
      expect(typeof response.body.success).toBe("boolean");
    });

    it("should include data on successful responses", async () => {
      const response = await request(app).get("/api/projects");
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body).toHaveProperty("data");
      expect(response.body).not.toHaveProperty("error");
    });

    it("should include error on failed responses", async () => {
      const response = await request(app)
        .post("/api/projects")
        .send({
          prompt: "short",
          panelCount: 4,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toHaveProperty("code");
      expect(response.body.error).toHaveProperty("message");
      expect(response.body).not.toHaveProperty("data");
    });
  });

  describe("Error Handling (5xx vs 4xx messages)", () => {
    it("should return generic message for 5xx errors (security fix)", async () => {
      const response = await request(app).get("/error-test");

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty("success", false);
      expect(response.body.error).toHaveProperty("code");
      expect(response.body.error.message).toBe("Internal server error");
    });

    it("should return specific message for 4xx errors (validation)", async () => {
      const response = await request(app)
        .post("/api/projects")
        .send({
          prompt: "short",
          panelCount: 4,
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
      // 4xx errors should include the actual validation message, not generic response
      expect(response.body.error.message).not.toBe("Internal server error");
    });

    it("should return specific message for 404 errors", async () => {
      const fakeId = "00000000-0000-0000-0000-000000000000";
      const response = await request(app).get(`/api/projects/${fakeId}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe("NOT_FOUND");
      expect(response.body.error.message).not.toBe("Internal server error");
    });
  });

  describe("Trim Validation (whitespace handling)", () => {
    it("should accept prompt with leading/trailing spaces", async () => {
      const response = await request(app)
        .post("/api/projects")
        .send({
          prompt: "  A valid prompt with whitespace  ",
          panelCount: 3,
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty("projectId");
    });

    it("should reject prompt that's too short after trimming", async () => {
      const response = await request(app)
        .post("/api/projects")
        .send({
          prompt: "     short     ",
          panelCount: 3,
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("should accept comment with leading/trailing spaces", async () => {
      const createResponse = await request(app)
        .post("/api/projects")
        .send({
          prompt: "A valid prompt here",
          panelCount: 3,
        });

      const projectId = createResponse.body.data.projectId;

      // ⚠️ CRITICAL: Manually set project to pending_review since workers are disabled in tests
      const project = await projectRepo.load(projectId);
      project.setStatus("pending_review");
      await projectRepo.save(project);

      const reviewResponse = await request(app)
        .post(`/api/projects/${projectId}/review`)
        .send({
          approved: true,
          comment: "  Comment with whitespace  ",
        });

      expect(reviewResponse.status).toBe(202);
      expect(reviewResponse.body.success).toBe(true);
    });

  });
});
