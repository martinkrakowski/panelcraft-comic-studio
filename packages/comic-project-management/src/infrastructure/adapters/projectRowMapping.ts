import { ComicProject } from '../../domain/entities/ComicProject.js';
import type { ComicProjectJSON } from '../../domain/entities/ComicProjectSerializer.js';

/**
 * Shared row shape for the comic_projects table (snake_case columns).
 *
 * This is the canonical mapping used by both the pg-backed and Supabase-backed
 * repositories. JSON-ish columns (`character_bible`, `style_references`,
 * `panels`) are kept as raw values — the storage driver is responsible for
 * encoding them for its transport (e.g. the pg driver must JSON-serialise
 * array-typed columns before binding them as parameters). Timestamps are
 * accepted as ISO strings (as returned by Supabase) or Date instances (as
 * returned by the pg driver) and are normalised to ISO strings when hydrating
 * a ComicProject.
 */
export interface ProjectRow {
  id: string;
  user_id: string | null;
  prompt: string;
  panel_count: number;
  genres: string[] | null;
  tones: string[] | null;
  character_bible: unknown;
  style_references: unknown;
  cover_image_url: string | null;
  selected_layout: string | null;
  layout_options: string[] | null;
  status: string;
  created_at: string | Date | null;
  updated_at: string | Date | null;
  panels: unknown;
  composed_image_url: string | null;
  is_shared: boolean;
}

/**
 * Write payload for an INSERT/upsert. `user_id` and `is_shared` are managed
 * separately (owner stamped on create, sharing toggled via setShared/
 * adoptOrphans).
 */
export type ProjectWriteRow = Omit<ProjectRow, 'user_id' | 'is_shared'>;

/**
 * Normalise a timestamptz value (Date or ISO string) to an ISO string.
 * Missing/null values fall back to the current time, matching the historical
 * behaviour of both adapters.
 */
export function toIsoString(value: string | Date | null): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

/**
 * Convert a database row (snake_case columns) to a domain ComicProject entity.
 */
export function rowToProject(row: ProjectRow): ComicProject {
  const json: ComicProjectJSON = {
    id: row.id,
    prompt: row.prompt,
    panelCount: row.panel_count,
    panels: (row.panels as ComicProjectJSON['panels']) || [],
    characterBible: row.character_bible || null,
    genres: row.genres || undefined,
    tones: row.tones || undefined,
    styleReferences:
      (row.style_references as ComicProjectJSON['styleReferences']) || null,
    coverImageUrl: row.cover_image_url,
    composedImageUrl: row.composed_image_url,
    selectedLayout: row.selected_layout,
    layoutOptions: row.layout_options,
    status: row.status || 'pending_creation',
    createdAt: toIsoString(row.created_at),
    lastReviewSubmittedAt: null,
  };

  return ComicProject.fromJSON(json);
}

/**
 * Convert a domain ComicProject entity to a database row (snake_case columns),
 * excluding the separately-managed columns `user_id` and `is_shared`.
 */
export function projectToRow(project: ComicProject): ProjectWriteRow {
  const json = project.toJSON();
  return {
    id: json.id,
    prompt: json.prompt,
    panel_count: json.panelCount,
    character_bible: json.characterBible ?? null,
    genres: json.genres || null,
    tones: json.tones || null,
    style_references: json.styleReferences ?? null,
    cover_image_url: json.coverImageUrl || null,
    composed_image_url: json.composedImageUrl || null,
    selected_layout: json.selectedLayout || null,
    layout_options: json.layoutOptions || null,
    status: json.status || 'pending_creation',
    created_at: json.createdAt,
    updated_at: new Date().toISOString(),
    panels: json.panels ?? [],
  };
}
