import { ComicProject } from '../../../domain/entities/ComicProject.js';

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
