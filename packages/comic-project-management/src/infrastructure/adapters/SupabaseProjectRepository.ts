import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@panelcraft/types';
import { ComicProject } from '../../domain/entities/ComicProject.js';
import type { RelationalDbPort } from '../../application/ports/out/relational-db.out-port.js';
import type { ComicProjectJSON } from '../../domain/entities/ComicProjectSerializer.js';
import { createLogger } from '@panelcraft/shared';

const logger = createLogger('SupabaseProjectRepository');

type ProjectRow = Database['public']['Tables']['comic_projects']['Row'];

/**
 * Supabase-backed implementation of the RelationalDbPort.
 * Persists ComicProject entities to the comic_projects table.
 * Uses the Supabase service-role client for unrestricted database access.
 */
export class SupabaseProjectRepository implements RelationalDbPort {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Save or upsert a comic project to the database.
   * Maps the domain entity to the database row format and calls UPSERT.
   */
  async save(project: ComicProject): Promise<void> {
    const row = this.projectToRow(project);

    const { error } = await this.supabase
      .from('comic_projects')
      .upsert(row, { onConflict: 'id' });

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
   * Convert a domain ComicProject entity to a database row.
   */
  private projectToRow(project: ComicProject): ProjectRow {
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
      // Null until frontend auth wires a real authenticated user_id through.
      // FK to auth.users and NOT NULL are dropped temporarily in migration
      // 20260525160702_make_user_id_nullable.sql — re-add once auth is live.
      user_id: null as unknown as string,
      panels: (json.panels ?? []) as unknown as ProjectRow['panels'],
    };
  }
}
