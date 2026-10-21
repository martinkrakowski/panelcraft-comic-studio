import type { Pool } from 'pg';
import { ComicProject } from '../../domain/entities/ComicProject.js';
import type { OwnerId } from '../../domain/value-objects/index.js';
import type {
  RelationalDbPort,
  ProjectShareState,
  ProjectVisibilityRow,
} from '../../application/ports/out/relational-db.out-port.js';
import type { ComicProjectJSON } from '../../domain/entities/ComicProjectSerializer.js';
import { createLogger } from '@panelcraft/shared';

const logger = createLogger('PgProjectRepository');

/**
 * Minimal row shape for comic_projects as returned by the pg driver
 * (snake_case columns, matching the plain Postgres schema in
 * db/migrations/001_init.sql). timestamptz columns come back as Date
 * instances, so the date-ish columns are typed as unknown and normalized on
 * read.
 */
interface ProjectRow {
  id: string;
  user_id: string | null;
  prompt: string;
  panel_count: number;
  genres: string[] | null;
  tones: string[] | null;
  character_bible: unknown | null;
  style_references: unknown | null;
  cover_image_url: string | null;
  selected_layout: string | null;
  layout_options: string[] | null;
  status: string;
  created_at: unknown;
  updated_at: unknown;
  panels: unknown;
  composed_image_url: string | null;
  is_shared: boolean;
}

/** Subset of ProjectRow used by listVisibleSummaries. */
interface ProjectSummaryRow {
  id: string;
  prompt: string;
  panel_count: number;
  status: string;
  created_at: unknown;
  cover_image_url: string | null;
  user_id: string | null;
  is_shared: boolean;
  genres: string[] | null;
  tones: string[] | null;
}

/**
 * Write payload for an INSERT/upsert. `user_id` and `is_shared` are managed
 * separately (owner stamped on create, sharing toggled via setShared/adoptOrphans).
 */
type ProjectWriteRow = Omit<ProjectRow, 'user_id' | 'is_shared'>;

/**
 * Plain-Postgres-backed implementation of the RelationalDbPort.
 * Persists ComicProject entities to the comic_projects table via the pg
 * driver. Mirrors the behaviour of SupabaseProjectRepository exactly, using
 * parameterised queries only.
 */
export class PgProjectRepository implements RelationalDbPort {
  constructor(private readonly pool: Pool) {}

  /**
   * Save or upsert a comic project to the database.
   *
   * `ownerId` is only set on creation. On updates it is omitted from the
   * upsert payload so the existing `user_id` is preserved rather than
   * overwritten — the worker and HITL handlers call save() without an owner.
   * The ON CONFLICT clause therefore touches user_id only when a non-null
   * value was provided (COALESCE keeps the stored owner otherwise).
   */
  async save(project: ComicProject, ownerId?: OwnerId): Promise<void> {
    const row = this.projectToRow(project);
    const userId = ownerId ? ownerId.getValue() : null;

    try {
      await this.pool.query(
        `INSERT INTO comic_projects (
           id, user_id, prompt, panel_count, genres, tones, character_bible,
           style_references, cover_image_url, selected_layout, layout_options,
           status, created_at, updated_at, panels, composed_image_url
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (id) DO UPDATE SET
           prompt = EXCLUDED.prompt,
           panel_count = EXCLUDED.panel_count,
           genres = EXCLUDED.genres,
           tones = EXCLUDED.tones,
           character_bible = EXCLUDED.character_bible,
           style_references = EXCLUDED.style_references,
           cover_image_url = EXCLUDED.cover_image_url,
           selected_layout = EXCLUDED.selected_layout,
           layout_options = EXCLUDED.layout_options,
           status = EXCLUDED.status,
           created_at = EXCLUDED.created_at,
           updated_at = EXCLUDED.updated_at,
           panels = EXCLUDED.panels,
           composed_image_url = EXCLUDED.composed_image_url,
           user_id = COALESCE(EXCLUDED.user_id, comic_projects.user_id)`,
        [
          row.id,
          userId,
          row.prompt,
          row.panel_count,
          row.genres,
          row.tones,
          row.character_bible,
          row.style_references,
          row.cover_image_url,
          row.selected_layout,
          row.layout_options,
          row.status,
          row.created_at,
          row.updated_at,
          row.panels,
          row.composed_image_url,
        ]
      );
      logger.debug(`Saved project ${project.getId().getValue()}`);
    } catch (error) {
      const message = this.errorMessage(error);
      logger.error(
        `Failed to save project ${project.getId().getValue()}: ${message}`
      );
      throw new Error(`Failed to save project: ${message}`);
    }
  }

  /**
   * Find a project by ID.
   * Returns null if not found.
   */
  async findById(id: string): Promise<ComicProject | null> {
    return this.load(id);
  }

  /**
   * Load a project by ID (alias for findById).
   * Used by the LangGraph workflow and application handlers.
   */
  async load(id: string): Promise<ComicProject | null> {
    try {
      const { rows } = await this.pool.query<ProjectRow>(
        'SELECT * FROM comic_projects WHERE id = $1',
        [id]
      );
      const row = rows[0];
      if (!row) {
        return null;
      }
      return this.rowToProject(row);
    } catch (error) {
      const message = this.errorMessage(error);
      logger.error(`Failed to load project ${id}: ${message}`);
      throw new Error(`Failed to load project: ${message}`);
    }
  }

  /**
   * Find all projects.
   * Does NOT filter by user_id — returns all projects in the database.
   * The API layer should enforce user-based filtering if needed.
   */
  async findAll(): Promise<ComicProject[]> {
    return this.listAll();
  }

  /**
   * List all projects (alias for findAll).
   * Used by the LangGraph workflow and application handlers.
   */
  async listAll(): Promise<ComicProject[]> {
    try {
      const { rows } = await this.pool.query<ProjectRow>(
        'SELECT * FROM comic_projects'
      );
      return rows.map((row) => this.rowToProject(row));
    } catch (error) {
      const message = this.errorMessage(error);
      logger.error(`Failed to list projects: ${message}`);
      throw new Error(`Failed to list projects: ${message}`);
    }
  }

  /**
   * List only the projects owned by the given user id.
   */
  async listByOwner(ownerId: OwnerId): Promise<ComicProject[]> {
    try {
      const { rows } = await this.pool.query<ProjectRow>(
        'SELECT * FROM comic_projects WHERE user_id = $1',
        [ownerId.getValue()]
      );
      return rows.map((row) => this.rowToProject(row));
    } catch (error) {
      const message = this.errorMessage(error);
      logger.error(`Failed to list projects for owner: ${message}`);
      throw new Error(`Failed to list projects: ${message}`);
    }
  }

  /**
   * Return the owning user id for a project, or null if the project is missing
   * or has no owner (legacy rows created before auth was wired).
   */
  async getOwnerId(id: string): Promise<string | null> {
    try {
      const { rows } = await this.pool.query<{
        user_id: string | null;
      }>('SELECT user_id FROM comic_projects WHERE id = $1', [id]);
      return rows[0]?.user_id ?? null;
    } catch (error) {
      const message = this.errorMessage(error);
      logger.error(`Failed to read owner for project ${id}: ${message}`);
      throw new Error(`Failed to read project owner: ${message}`);
    }
  }

  /**
   * List projects visible to the owner: their own plus all shared projects.
   * Returns a lightweight read-model (no full entity hydration).
   */
  async listVisibleSummaries(
    ownerId: OwnerId
  ): Promise<ProjectVisibilityRow[]> {
    try {
      const { rows } = await this.pool.query<ProjectSummaryRow>(
        `SELECT id, prompt, panel_count, status, created_at, cover_image_url,
                user_id, is_shared, genres, tones
         FROM comic_projects
         WHERE user_id = $1 OR is_shared = true`,
        [ownerId.getValue()]
      );
      return rows.map((row) => ({
        id: row.id,
        prompt: row.prompt,
        panelCount: row.panel_count,
        status: row.status,
        createdAt: this.toIsoString(row.created_at),
        coverImageUrl: row.cover_image_url,
        ownerId: row.user_id ?? null,
        isShared: row.is_shared,
        genres: row.genres ?? [],
        tones: row.tones ?? [],
      }));
    } catch (error) {
      const message = this.errorMessage(error);
      logger.error(`Failed to list visible projects: ${message}`);
      throw new Error(`Failed to list projects: ${message}`);
    }
  }

  /**
   * Owner + sharing state for authorization, or null if the project is absent.
   */
  async getShareState(id: string): Promise<ProjectShareState | null> {
    try {
      const { rows } = await this.pool.query<{
        user_id: string | null;
        is_shared: boolean;
      }>('SELECT user_id, is_shared FROM comic_projects WHERE id = $1', [id]);
      const row = rows[0];
      if (!row) return null;
      return { ownerId: row.user_id ?? null, isShared: row.is_shared };
    } catch (error) {
      const message = this.errorMessage(error);
      logger.error(`Failed to read share state for ${id}: ${message}`);
      throw new Error(`Failed to read project: ${message}`);
    }
  }

  /** Toggle whether a project is shared to all users. */
  async setShared(id: string, shared: boolean): Promise<void> {
    try {
      await this.pool.query(
        'UPDATE comic_projects SET is_shared = $2 WHERE id = $1',
        [id, shared]
      );
    } catch (error) {
      const message = this.errorMessage(error);
      logger.error(`Failed to set shared=${shared} on ${id}: ${message}`);
      throw new Error(`Failed to update sharing: ${message}`);
    }
  }

  /** Claim all ownerless projects for `ownerId` and mark them shared. */
  async adoptOrphans(ownerId: OwnerId): Promise<number> {
    try {
      const result = await this.pool.query(
        `UPDATE comic_projects
         SET user_id = $1, is_shared = true
         WHERE user_id IS NULL
         RETURNING id`,
        [ownerId.getValue()]
      );
      return result.rowCount ?? 0;
    } catch (error) {
      const message = this.errorMessage(error);
      logger.error(`Failed to adopt orphan projects: ${message}`);
      throw new Error(`Failed to adopt projects: ${message}`);
    }
  }

  /**
   * Convert a database row to a domain ComicProject entity.
   */
  private rowToProject(row: ProjectRow): ComicProject {
    const json: ComicProjectJSON = {
      id: row.id,
      prompt: row.prompt,
      panelCount: row.panel_count,
      panels: (row.panels as unknown as ComicProjectJSON['panels']) || [],
      characterBible: row.character_bible
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (row.character_bible as any)
        : null,
      genres: row.genres || undefined,
      tones: row.tones || undefined,
      styleReferences: row.style_references
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (row.style_references as any)
        : null,
      coverImageUrl: row.cover_image_url,
      composedImageUrl: row.composed_image_url,
      selectedLayout: row.selected_layout,
      layoutOptions: row.layout_options,
      status: row.status || 'pending_creation',
      createdAt: this.toIsoString(row.created_at),
      lastReviewSubmittedAt: null,
    };

    return ComicProject.fromJSON(json);
  }

  /**
   * Convert a domain ComicProject entity to a database row, excluding the
   * separately-managed columns `user_id` (set in save() on create) and
   * `is_shared` (toggled via setShared/adoptOrphans, defaulted by the DB) so a
   * routine save() never clobbers ownership or sharing.
   */
  private projectToRow(project: ComicProject): ProjectWriteRow {
    const json = project.toJSON();
    return {
      id: json.id,
      prompt: json.prompt,
      panel_count: json.panelCount,
      character_bible: json.characterBible
        ? JSON.stringify(json.characterBible)
        : null,
      genres: json.genres || null,
      tones: json.tones || null,
      style_references: json.styleReferences
        ? JSON.stringify(json.styleReferences)
        : null,
      cover_image_url: json.coverImageUrl || null,
      composed_image_url: json.composedImageUrl || null,
      selected_layout: json.selectedLayout || null,
      layout_options: json.layoutOptions || null,
      status: json.status || 'pending_creation',
      created_at: json.createdAt,
      updated_at: new Date().toISOString(),
      panels: JSON.stringify(json.panels ?? []),
    };
  }

  /** Normalise a timestamptz value (Date or ISO string) to an ISO string. */
  private toIsoString(value: unknown): string {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return value;
    return new Date().toISOString();
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
