-- =============================================================================
-- Plain Postgres 17 schema for comic_projects and langgraph_checkpoints.
--
-- Derived from supabase/migrations up to 20260528180000 (the final state of
-- those tables after all 15 migrations), with every Supabase-only concern
-- removed:
--   * RLS policies and row-level security
--   * auth.* references (including the FK to auth.users)
--   * grants to anon / authenticated / service_role
--   * storage.* buckets and policies
--   * supabase_vault / extensions schemas
--   * pg_stat_statements / uuid-ossp / pgcrypto extensions
--
-- Uses gen_random_uuid() (core since Postgres 13, no extension required).
-- Safe for a fresh DB only: plain CREATE statements, no IF NOT EXISTS.
-- =============================================================================

CREATE TABLE comic_projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    prompt text NOT NULL,
    panel_count integer NOT NULL,
    genres text[],
    tones text[],
    character_bible jsonb,
    style_references jsonb,
    cover_image_url text,
    selected_layout text,
    layout_options text[],
    status text DEFAULT 'pending_creation'::text NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    panels jsonb NOT NULL DEFAULT '[]'::jsonb,
    composed_image_url text,
    is_shared boolean NOT NULL DEFAULT false,
    CONSTRAINT comic_projects_pkey PRIMARY KEY (id),
    CONSTRAINT comic_projects_status_check CHECK (status = ANY (ARRAY[
        'pending_creation'::text,
        'processing'::text,
        'pending_layout'::text,
        'pending_review'::text,
        'completed'::text,
        'failed'::text,
        'extending'::text,
        'pending_review_extend'::text,
        'composing'::text,
        'pending_review_final'::text,
        'regenerating_cover'::text,
        'pending_review_cover'::text
    ])),
    CONSTRAINT comic_projects_panel_count_check CHECK (panel_count BETWEEN 1 AND 24)
);

CREATE INDEX comic_projects_user_id ON comic_projects USING btree (user_id);

CREATE INDEX comic_projects_is_shared ON comic_projects (is_shared) WHERE is_shared = true;

CREATE TABLE langgraph_checkpoints (
    thread_id text NOT NULL,
    checkpoint_id text NOT NULL,
    checkpoint jsonb NOT NULL,
    metadata jsonb,
    parent_id text,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT langgraph_checkpoints_pkey PRIMARY KEY (thread_id, checkpoint_id)
);

CREATE INDEX langgraph_checkpoints_thread_id ON langgraph_checkpoints USING btree (thread_id);

CREATE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

ALTER FUNCTION set_updated_at() SET search_path = '';

CREATE TRIGGER comic_projects_set_updated_at
    BEFORE UPDATE ON comic_projects
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();
