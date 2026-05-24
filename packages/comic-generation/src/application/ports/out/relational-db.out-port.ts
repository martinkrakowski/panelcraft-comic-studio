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
   */
  save(project: ComicProject): Promise<void>;

  /**
   * Load a project by ID.
   */
  load(id: string): Promise<ComicProject | null>;

  /**
   * List all projects.
   */
  listAll(): Promise<ComicProject[]>;
}
