import type { ComicProject } from '@panelcraft/comic-project-management';

/**
 * RelationalDbPort defines the contract for project persistence.
 *
 * This is an outbound port in the Hexagonal Architecture pattern.
 * Implement this interface in your infrastructure adapter.
 */
export interface RelationalDbPort {
  /**
   * Save or update a project entity.
   *
   * @param ownerId - When provided (project creation), the owning user's id is
   *   persisted. Omit on updates so the existing owner is preserved rather than
   *   overwritten.
   */
  save(project: ComicProject, ownerId?: string): Promise<void>;

  /**
   * Load a project by ID.
   */
  load(id: string): Promise<ComicProject | null>;

  /**
   * List all projects (unscoped). Used by internal/worker paths.
   */
  listAll(): Promise<ComicProject[]>;

  /**
   * List only the projects owned by `ownerId`.
   */
  listByOwner(ownerId: string): Promise<ComicProject[]>;

  /**
   * Return the owning user id for a project, or null if the project is missing
   * or has no owner (legacy rows). Used for ownership authorization checks.
   */
  getOwnerId(id: string): Promise<string | null>;
}
