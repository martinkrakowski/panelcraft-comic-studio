import {
  RelationalDbPort,
  ProjectShareState,
  ProjectVisibilityRow,
} from '../../application/ports/out/relational-db.out-port.js';
import { ComicProject } from '../../domain/entities/ComicProject.js';
import type { OwnerId } from '../../domain/value-objects/index.js';

/**
 * An in-memory implementation of the RelationalDbPort.
 * Stores projects in a simple map. Useful for demos and testing.
 */
export class InMemoryProjectRepository implements RelationalDbPort {
  private readonly projects = new Map<string, ComicProject>();
  private readonly owners = new Map<string, string>();
  private readonly shared = new Set<string>();

  async save(project: ComicProject, ownerId?: OwnerId): Promise<void> {
    const id = project.getId().getValue();
    this.projects.set(id, ComicProject.fromJSON(project.toJSON()));
    // Only stamp the owner on creation; updates omit ownerId and preserve it.
    if (ownerId) {
      this.owners.set(id, ownerId.getValue());
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

  async listByOwner(ownerId: OwnerId): Promise<ComicProject[]> {
    return Array.from(this.projects.entries())
      .filter(([id]) => this.owners.get(id) === ownerId.getValue())
      .map(([, project]) => ComicProject.fromJSON(project.toJSON()));
  }

  async getOwnerId(id: string): Promise<string | null> {
    return this.owners.get(id) ?? null;
  }

  async listVisibleSummaries(
    ownerId: OwnerId
  ): Promise<ProjectVisibilityRow[]> {
    const owner = ownerId.getValue();
    return Array.from(this.projects.entries())
      .filter(([id]) => this.owners.get(id) === owner || this.shared.has(id))
      .map(([id, project]) => {
        const json = project.toJSON();
        return {
          id: json.id,
          prompt: json.prompt,
          panelCount: json.panelCount,
          status: json.status,
          createdAt: json.createdAt,
          coverImageUrl: json.coverImageUrl ?? null,
          ownerId: this.owners.get(id) ?? null,
          isShared: this.shared.has(id),
        };
      });
  }

  async getShareState(id: string): Promise<ProjectShareState | null> {
    if (!this.projects.has(id)) return null;
    return {
      ownerId: this.owners.get(id) ?? null,
      isShared: this.shared.has(id),
    };
  }

  async setShared(id: string, shared: boolean): Promise<void> {
    if (shared) this.shared.add(id);
    else this.shared.delete(id);
  }

  async adoptOrphans(ownerId: OwnerId): Promise<number> {
    let count = 0;
    for (const id of this.projects.keys()) {
      if (!this.owners.has(id)) {
        this.owners.set(id, ownerId.getValue());
        this.shared.add(id);
        count += 1;
      }
    }
    return count;
  }

  async findById(id: string): Promise<ComicProject | null> {
    return this.load(id);
  }

  async findAll(): Promise<ComicProject[]> {
    return this.listAll();
  }
}
