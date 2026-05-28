import type {
  ComicProject,
  OwnerId,
  ProjectShareState,
  ProjectVisibilityRow,
} from '@panelcraft/comic-project-management';

export type {
  ProjectShareState,
  ProjectVisibilityRow,
} from '@panelcraft/comic-project-management';

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
  save(project: ComicProject, ownerId?: OwnerId): Promise<void>;

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
  listByOwner(ownerId: OwnerId): Promise<ComicProject[]>;

  /**
   * Return the owning user id for a project, or null if the project is missing
   * or has no owner (legacy rows). Used for ownership authorization checks.
   */
  getOwnerId(id: string): Promise<string | null>;

  /**
   * List the projects visible to `ownerId`: the ones they own plus every
   * shared project. Returns a lightweight read-model for the dashboard.
   */
  listVisibleSummaries(ownerId: OwnerId): Promise<ProjectVisibilityRow[]>;

  /**
   * Owner + sharing state of a project, or null if it doesn't exist. Used to
   * authorize viewing a (possibly shared) project.
   */
  getShareState(id: string): Promise<ProjectShareState | null>;

  /** Toggle whether a project is shared to all users. */
  setShared(id: string, shared: boolean): Promise<void>;

  /**
   * One-time recovery: claim every ownerless project (user_id IS NULL) for
   * `ownerId` and mark it shared. Returns the number of projects adopted.
   */
  adoptOrphans(ownerId: OwnerId): Promise<number>;
}
