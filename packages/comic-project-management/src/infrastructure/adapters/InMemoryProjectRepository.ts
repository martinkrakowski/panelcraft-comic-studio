import { RelationalDbPort } from "../../application/ports/out/relational-db.out-port.js";
import { ComicProject } from "../../domain/entities/ComicProject.js";

/**
 * An in-memory implementation of the RelationalDbPort.
 * Stores projects in a simple map. Useful for demos and testing.
 */
export class InMemoryProjectRepository implements RelationalDbPort {
  private readonly projects = new Map<string, ComicProject>();

  async save(project: ComicProject): Promise<void> {
    this.projects.set(
      project.getId(),
      ComicProject.fromJSON(project.toJSON())
    );
  }

  async findById(id: string): Promise<ComicProject | null> {
    const project = this.projects.get(id);
    return project ? ComicProject.fromJSON(project.toJSON()) : null;
  }

  async findAll(): Promise<ComicProject[]> {
    return Array.from(this.projects.values()).map(project =>
      ComicProject.fromJSON(project.toJSON())
    );
  }
}
