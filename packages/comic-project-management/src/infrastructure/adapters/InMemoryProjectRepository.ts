import { RelationalDbPort } from '../../application/ports/out/relational-db.out-port.js';
import { ComicProject } from '../../domain/entities/ComicProject.js';

/**
 * An in-memory implementation of the RelationalDbPort.
 * Stores projects in a simple map. Useful for demos and testing.
 */
export class InMemoryProjectRepository implements RelationalDbPort {
  private readonly projects = new Map<string, ComicProject>();
  private readonly owners = new Map<string, string>();

  async save(project: ComicProject, ownerId?: string): Promise<void> {
    const id = project.getId().getValue();
    this.projects.set(id, ComicProject.fromJSON(project.toJSON()));
    // Only stamp the owner on creation; updates omit ownerId and preserve it.
    if (ownerId) {
      this.owners.set(id, ownerId);
    }
  }

  async load(id: string): Promise<ComicProject | null> {
    const project = this.projects.get(id);
    return project ? ComicProject.fromJSON(project.toJSON()) : null;
  }

  async listAll(): Promise<ComicProject[]> {
    return Array.from(this.projects.values()).map((project) =>
      ComicProject.fromJSON(project.toJSON())
    );
  }

  async listByOwner(ownerId: string): Promise<ComicProject[]> {
    return Array.from(this.projects.entries())
      .filter(([id]) => this.owners.get(id) === ownerId)
      .map(([, project]) => ComicProject.fromJSON(project.toJSON()));
  }

  async getOwnerId(id: string): Promise<string | null> {
    return this.owners.get(id) ?? null;
  }

  async findById(id: string): Promise<ComicProject | null> {
    return this.load(id);
  }

  async findAll(): Promise<ComicProject[]> {
    return this.listAll();
  }
}
