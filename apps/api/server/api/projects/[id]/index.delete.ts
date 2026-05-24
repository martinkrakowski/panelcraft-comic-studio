import { defineEventHandler, getRouterParam, setResponseStatus } from 'h3';
import { fail } from '../../../utils/envelope.js';
import { z } from 'zod';
import { getSupabaseClient } from '../../../utils/supabase.js';

/**
 * DELETE /api/projects/[id]
 * Delete project and clean up all associated Supabase Storage assets
 * @param event.params.id - Project UUID
 * @returns 200 on success, 404 if not found, 500 on error
 */
export default defineEventHandler(async (event) => {
  const { id: projectId } = z.object({ id: z.string().uuid() }).parse({
    id: getRouterParam(event, 'id'),
  });

  try {
    // 1. Verify project exists and get storage paths
    const { data: project, error: fetchError } = await supabase
      .from('comic_projects')
      .select('id, user_id')
      .eq('id', projectId)
      .single();

    if (fetchError || !project) {
      setResponseStatus(event, 404);
      return fail('Project not found');
    }

    // 2. List all files in comics/${projectId}/ folder
    const { data: files, error: listError } = await supabase.storage
      .from('comics')
      .list(`${projectId}/`, { limit: 100 }); // List top-level folder contents

    if (listError) {
      console.warn(
        `Failed to list storage files for project ${projectId}:`,
        listError.message
      );
    } else if (files && files.length > 0) {
      // Recursively collect all file paths (including subfolders)
      const filePaths: string[] = [];

      for (const file of files) {
        if (file.name) {
          // If it's a folder (no metadata.size), list its contents
          if (!file.metadata?.size) {
            const { data: subFiles } = await supabase.storage
              .from('comics')
              .list(`${projectId}/${file.name}`, { limit: 100 });
            if (subFiles) {
              subFiles.forEach((subFile) => {
                if (subFile.name) {
                  filePaths.push(`${projectId}/${file.name}/${subFile.name}`);
                }
              });
            }
          } else {
            filePaths.push(`${projectId}/${file.name}`);
          }
        }
      }

      // Delete all collected files
      if (filePaths.length > 0) {
        const { error: deleteStorageError } = await supabase.storage
          .from('comics')
          .remove(filePaths);

        if (deleteStorageError) {
          console.warn(
            `Failed to delete storage files for project ${projectId}:`,
            deleteStorageError.message
          );
        }
      }
    }

    // 3. Delete langgraph checkpoints for this project's thread
    const { error: checkpointError } = await supabase
      .from('langgraph_checkpoints')
      .delete()
      .eq('thread_id', projectId);

    if (checkpointError) {
      console.warn(
        `Failed to delete checkpoints for project ${projectId}:`,
        checkpointError.message
      );
    }

    // 4. Delete project from database
    const { error: deleteError } = await supabase
      .from('comic_projects')
      .delete()
      .eq('id', projectId);

    if (deleteError) {
      setResponseStatus(event, 500);
      return fail('Failed to delete project', deleteError.message);
    }

    setResponseStatus(event, 200);
    return ok({ id: projectId, deleted: true });
  } catch (error) {
    setResponseStatus(event, 500);
    return fail(
      'Failed to delete project',
      error instanceof Error ? error.message : ''
    );
  }
});
