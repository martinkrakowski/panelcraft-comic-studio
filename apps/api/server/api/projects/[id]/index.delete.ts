import { defineEventHandler, getRouterParam, setResponseStatus } from 'h3';
import { fail, ok } from '../../../utils/envelope.js';
import { z, ZodError } from 'zod';
import { getSupabaseClient } from '../../../utils/supabase.js';
import { requireProjectOwner } from '../../../utils/require-owner.js';

/**
 * DELETE /api/projects/[id]
 *
 * Delete a project and clean up all associated Supabase Storage assets and
 * LangGraph checkpoints. Cleanup happens in three steps:
 *   1. List + delete storage objects under `comics/${id}/`
 *   2. Delete LangGraph checkpoint rows for thread_id = id
 *   3. Delete the `comic_projects` row
 *
 * If any cleanup step fails the partial failures are collected and the
 * response returns a 500 with a `partialCleanupErrors` array — this
 * prevents the historical bug where storage orphans went unreported
 * while the API still returned 200.
 *
 * @returns 200 on success, 400 on invalid id, 404 if not found, 500 on cleanup failure
 */
export default defineEventHandler(async (event) => {
  let projectId: string;
  try {
    projectId = z
      .object({ id: z.string().uuid() })
      .parse({ id: getRouterParam(event, 'id') }).id;
  } catch (err) {
    setResponseStatus(event, 400);
    return fail(
      'INVALID_PARAM',
      err instanceof ZodError
        ? 'Invalid project id (must be UUID)'
        : 'Invalid request'
    );
  }

  await requireProjectOwner(event, projectId);

  const cleanupErrors: Array<{ step: string; message: string }> = [];

  try {
    const supabase = getSupabaseClient();

    // 1. Verify project exists
    const { data: project, error: fetchError } = await supabase
      .from('comic_projects')
      .select('id, user_id')
      .eq('id', projectId)
      .single();

    if (fetchError || !project) {
      setResponseStatus(event, 404);
      return fail('NOT_FOUND', 'Project not found');
    }

    // 2. Recursively delete all storage objects under comics/${projectId}/
    // Collect all file paths using depth-first traversal with pagination.
    // Folders are detected by checking metadata.size === undefined (files always
    // have a size property, even if it's 0).
    const filePaths: string[] = [];
    const prefixStack: string[] = [`${projectId}`]; // depth-first work queue
    const pageSize = 100;

    while (prefixStack.length > 0) {
      const prefix = prefixStack.pop()!;
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: entries, error: listError } = await supabase.storage
          .from('comics')
          .list(prefix, { limit: pageSize, offset });

        if (listError) {
          cleanupErrors.push({
            step: `storage_list:${prefix}`,
            message: listError.message,
          });
          break; // move to next prefix on list error
        }

        if (!entries || entries.length === 0) {
          hasMore = false;
          break;
        }

        for (const entry of entries) {
          if (!entry.name) continue;
          const fullPath = `${prefix}/${entry.name}`;
          // Files have metadata.size (even zero-byte files); folders do not
          const isFile = typeof entry.metadata?.size === 'number';
          if (isFile) {
            filePaths.push(fullPath);
          } else {
            // Folder: add to work queue for recursive traversal
            prefixStack.push(fullPath);
          }
        }

        // Paginate if this batch was full
        if (entries.length < pageSize) {
          hasMore = false;
        } else {
          offset += pageSize;
        }
      }
    }

    // Delete all collected file paths
    if (filePaths.length > 0) {
      const { error: deleteStorageError } = await supabase.storage
        .from('comics')
        .remove(filePaths);

      if (deleteStorageError) {
        cleanupErrors.push({
          step: 'storage_delete',
          message: deleteStorageError.message,
        });
      }
    }

    // 3. Delete LangGraph checkpoints
    const { error: checkpointError } = await supabase
      .from('langgraph_checkpoints')
      .delete()
      .eq('thread_id', projectId);

    if (checkpointError) {
      cleanupErrors.push({
        step: 'checkpoint_delete',
        message: checkpointError.message,
      });
    }

    // 4. Delete project row
    const { error: deleteError } = await supabase
      .from('comic_projects')
      .delete()
      .eq('id', projectId);

    if (deleteError) {
      setResponseStatus(event, 500);
      return fail('DELETE_ERROR', deleteError.message, {
        partialCleanupErrors: cleanupErrors,
      });
    }

    if (cleanupErrors.length > 0) {
      // Project row deleted but some asset cleanup failed — surface to caller
      // so they can re-run cleanup or alert ops, but mark deleted=true since
      // the canonical record is gone.
      setResponseStatus(event, 500);
      return fail(
        'PARTIAL_CLEANUP_FAILURE',
        'Project deleted but some assets could not be cleaned up',
        { id: projectId, deleted: true, partialCleanupErrors: cleanupErrors }
      );
    }

    setResponseStatus(event, 200);
    return ok({ id: projectId, deleted: true });
  } catch (error) {
    setResponseStatus(event, 500);
    return fail(
      'DELETE_ERROR',
      error instanceof Error ? error.message : 'Unknown error',
      { partialCleanupErrors: cleanupErrors }
    );
  }
});
