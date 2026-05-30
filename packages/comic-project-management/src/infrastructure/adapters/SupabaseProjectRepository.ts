import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@panelcraft/types';
import { ComicProject } from '../../domain/entities/ComicProject.js';
import type { OwnerId } from '../../domain/value-objects/index.js';
import type {
  RelationalDbPort,
  ProjectShareState,
  ProjectVisibilityRow,
} from '../../application/ports/out/relational-db.out-port.js';
import type { ComicProjectJSON } from '../../domain/entities/ComicProjectSerializer.js';
import { createLogger } from '@panelcraft/shared';

const logger = createLogger('SupabaseProjectRepository');

type ProjectRow = Database['public']['Tables']['comic_projects']['Row'];
type ProjectInsert = Database['public']['Tables']['comic_projects']['Insert'];

/**
 * Supabase-backed implementation of the RelationalDbPort.
 * Persists ComicProject entities to the comic_projects table.
 * Uses the Supabase service-role client for unrestricted database access.
 */
export class SupabaseProjectRepository implements RelationalDbPort {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Save or upsert a comic project to the database.
   *
   * `ownerId` is only set on creation. On updates it is omitted from the upsert
   * payload so the existing `user_id` is preserved rather than overwritten —
   * the worker and HITL handlers call save() without an owner.
   */
  async save(project: ComicProject, ownerId?: OwnerId): Promise<void> {
    const row = this.projectToRow(project);
    const payload = (ownerId
      ? { ...row, user_id: ownerId.getValue() }
      : row) as unknown as ProjectInsert;

    const { error } = await this.supabase
      .from('comic_projects')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      logger.error(
        `Failed to save project ${project.getId().getValue()}: ${error.message}`
      );
      throw new Error(`Failed to save project: ${error.message}`);
    }

    logger.debug(`Saved project ${project.getId().getValue()}`);
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
    const { data, error } = await this.supabase
      .from('comic_projects')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      logger.error(`Failed to load project ${id}: ${error.message}`);
      throw new Error(`Failed to load project: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return this.rowToProject(data);
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
    const { data, error } = await this.supabase
      .from('comic_projects')
      .select('*');

    if (error) {
      logger.error(`Failed to list projects: ${error.message}`);
      throw new Error(`Failed to list projects: ${error.message}`);
    }

    return data.map((row) => this.rowToProject(row));
  }

  /**
   * List only the projects owned by the given user id.
   */
  async listByOwner(ownerId: OwnerId): Promise<ComicProject[]> {
    const { data, error } = await this.supabase
      .from('comic_projects')
      .select('*')
      .eq('user_id', ownerId.getValue());

    if (error) {
      logger.error(`Failed to list projects for owner: ${error.message}`);
      throw new Error(`Failed to list projects: ${error.message}`);
    }

    return data.map((row) => this.rowToProject(row));
  }

  /**
   * Return the owning user id for a project, or null if the project is missing
   * or has no owner (legacy rows created before auth was wired).
   */
  async getOwnerId(id: string): Promise<string | null> {
    const { data, error } = await this.supabase
      .from('comic_projects')
      .select('user_id')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      logger.error(`Failed to read owner for project ${id}: ${error.message}`);
      throw new Error(`Failed to read project owner: ${error.message}`);
    }

    return data?.user_id ?? null;
  }

  /**
   * List projects visible to the owner: their own plus all shared projects.
   * Returns a lightweight read-model (no full entity hydration).
   */
  async listVisibleSummaries(
    ownerId: OwnerId
  ): Promise<ProjectVisibilityRow[]> {
    const { data, error } = await this.supabase
      .from('comic_projects')
      .select(
        'id, prompt, panel_count, status, created_at, cover_image_url, user_id, is_shared, genres, tones'
      )
      .or(`user_id.eq.${ownerId.getValue()},is_shared.eq.true`);

    if (error) {
      logger.error(`Failed to list visible projects: ${error.message}`);
      throw new Error(`Failed to list projects: ${error.message}`);
    }

    return data.map((row) => ({
      id: row.id,
      prompt: row.prompt,
      panelCount: row.panel_count,
      status: row.status,
      createdAt: row.created_at ?? new Date().toISOString(),
      coverImageUrl: row.cover_image_url,
      ownerId: row.user_id ?? null,
      isShared: row.is_shared,
      genres: row.genres ?? [],
      tones: row.tones ?? [],
    }));
  }

  /**
   * Owner + sharing state for authorization, or null if the project is absent.
   */
  async getShareState(id: string): Promise<ProjectShareState | null> {
    const { data, error } = await this.supabase
      .from('comic_projects')
      .select('user_id, is_shared')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      logger.error(`Failed to read share state for ${id}: ${error.message}`);
      throw new Error(`Failed to read project: ${error.message}`);
    }

    if (!data) return null;
    return { ownerId: data.user_id ?? null, isShared: data.is_shared };
  }

  /** Toggle whether a project is shared to all users. */
  async setShared(id: string, shared: boolean): Promise<void> {
    const { error } = await this.supabase
      .from('comic_projects')
      .update({ is_shared: shared })
      .eq('id', id);

    if (error) {
      logger.error(`Failed to set shared=${shared} on ${id}: ${error.message}`);
      throw new Error(`Failed to update sharing: ${error.message}`);
    }
  }

  /** Claim all ownerless projects for `ownerId` and mark them shared. */
  async adoptOrphans(ownerId: OwnerId): Promise<number> {
    const { data, error } = await this.supabase
      .from('comic_projects')
      .update({ user_id: ownerId.getValue(), is_shared: true })
      .is('user_id', null)
      .select('id');

    if (error) {
      logger.error(`Failed to adopt orphan projects: ${error.message}`);
      throw new Error(`Failed to adopt projects: ${error.message}`);
    }

    return data?.length ?? 0;
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
      createdAt: row.created_at || new Date().toISOString(),
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
  private projectToRow(
    project: ComicProject
  ): Omit<ProjectRow, 'user_id' | 'is_shared'> {
    const json = project.toJSON();
    return {
      id: json.id,
      prompt: json.prompt,
      panel_count: json.panelCount,
      character_bible: json.characterBible
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (json.characterBible as any)
        : null,
      genres: json.genres || null,
      tones: json.tones || null,
      style_references: json.styleReferences
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (json.styleReferences as any)
        : null,
      cover_image_url: json.coverImageUrl || null,
      composed_image_url: json.composedImageUrl || null,
      selected_layout: json.selectedLayout || null,
      layout_options: json.layoutOptions || null,
      status: json.status || 'pending_creation',
      created_at: json.createdAt,
      updated_at: new Date().toISOString(),
      panels: (json.panels ?? []) as unknown as ProjectRow['panels'],
    };
  }
}
