import { ComicProject } from '../../../domain/entities/ComicProject.js';

/** Owner + sharing state of a project, for authorization decisions. */
export interface ProjectShareState {
  /** The owning user id, or null for legacy/unowned rows. */
  ownerId: string | null;
  isShared: boolean;
}

/** List read-model row carrying just what the dashboard needs per project. */
export interface ProjectVisibilityRow {
  id: string;
  prompt: string;
  panelCount: number;
  status: string;
  createdAt: string;
  coverImageUrl: string | null;
  ownerId: string | null;
  isShared: boolean;
}

/**
 * RelationalDbPort defines the contract for external relational database operations.
 *
 * This is an outbound port in the Hexagonal Architecture pattern.
 * Implement this interface in your infrastructure adapter.
 */
export interface RelationalDbPort {
  /**
   * Save or update a comic project.
   */
  save(project: ComicProject): Promise<void>;

  /**
   * Find a comic project by ID.
   */
  findById(id: string): Promise<ComicProject | null>;

  /**
   * Find all comic projects.
   */
  findAll(): Promise<ComicProject[]>;
}
