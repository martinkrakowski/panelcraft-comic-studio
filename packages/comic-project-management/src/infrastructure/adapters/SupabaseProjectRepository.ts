import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@panelcraft/types';
import { ComicProject } from '../../domain/entities/ComicProject.js';
import type { OwnerId } from '../../domain/value-objects/index.js';
import type {
  RelationalDbPort,
  ProjectShareState,
  ProjectVisibilityRow,
} from '../../application/ports/out/relational-db.out-port.js';
import { projectToRow, rowToProject } from './projectRowMapping.js';
import { createLogger } from '@panelcraft/shared';

const logger = createLogger('SupabaseProjectRepository');

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
    const row = projectToRow(project);
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

    return rowToProject(data);
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

    return data.map((row) => rowToProject(row));
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

    return data.map((row) => rowToProject(row));
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
}
