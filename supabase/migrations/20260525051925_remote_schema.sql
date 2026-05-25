


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";





SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."comic_projects" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "prompt" "text" NOT NULL,
    "panel_count" integer NOT NULL,
    "genres" "text"[],
    "tones" "text"[],
    "character_bible" "jsonb",
    "style_references" "jsonb",
    "cover_image_url" "text",
    "selected_layout" "text",
    "layout_options" "text"[],
    "status" "text" DEFAULT 'pending_creation'::"text",
    "created_at" timestamp without time zone DEFAULT "now"(),
    "updated_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."comic_projects" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."langgraph_checkpoints" (
    "thread_id" "text" NOT NULL,
    "checkpoint_id" "text" NOT NULL,
    "checkpoint" "jsonb" NOT NULL,
    "metadata" "jsonb",
    "parent_id" "text",
    "created_at" timestamp without time zone DEFAULT "now"()
);


ALTER TABLE "public"."langgraph_checkpoints" OWNER TO "postgres";


ALTER TABLE ONLY "public"."comic_projects"
    ADD CONSTRAINT "comic_projects_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."langgraph_checkpoints"
    ADD CONSTRAINT "langgraph_checkpoints_pkey" PRIMARY KEY ("thread_id", "checkpoint_id");



CREATE INDEX "comic_projects_user_id" ON "public"."comic_projects" USING "btree" ("user_id");



CREATE INDEX "langgraph_checkpoints_thread_id" ON "public"."langgraph_checkpoints" USING "btree" ("thread_id");



ALTER TABLE ONLY "public"."comic_projects"
    ADD CONSTRAINT "comic_projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Users can create projects" ON "public"."comic_projects" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can delete own projects" ON "public"."comic_projects" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can read own projects" ON "public"."comic_projects" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own projects" ON "public"."comic_projects" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "block-all-public-access" ON "public"."langgraph_checkpoints" USING (false) WITH CHECK (false);



ALTER TABLE "public"."comic_projects" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."langgraph_checkpoints" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";





































































































































































GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."comic_projects" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."comic_projects" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."comic_projects" TO "service_role";



GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."langgraph_checkpoints" TO "anon";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."langgraph_checkpoints" TO "authenticated";
GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLE "public"."langgraph_checkpoints" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES,TRIGGER,TRUNCATE,MAINTAIN ON TABLES TO "service_role";































