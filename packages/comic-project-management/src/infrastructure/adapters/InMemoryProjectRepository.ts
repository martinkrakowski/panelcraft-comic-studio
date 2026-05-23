import { RelationalDbPort } from "../../application/ports/out/relational-db.out-port.js";
import { ComicProject } from "../../domain/entities/ComicProject.js";

/**
 * An in-memory implementation of the RelationalDbPort.
 * Stores projects in a simple map. Useful for demos and testing.
 */
export class InMemoryProjectRepository implements RelationalDbPort {
  private readonly projects = new Map<string, ComicProject>();

  async save(project: ComicProject): Promise<void> {
    this.projects.set(project.getId(), project);
  }

  async findById(id: string): Promise<ComicProject | null> {
    return this.projects.get(id) || null;
  }

  async findAll(): Promise<ComicProject[]> {
    return Array.from(this.projects.values());
  }
}
