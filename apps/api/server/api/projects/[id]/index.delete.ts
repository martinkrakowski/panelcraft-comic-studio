import { defineEventHandler, getRouterParam, setResponseStatus } from 'h3';
import { fail, ok } from '../../../utils/envelope.js';
import { z, ZodError } from 'zod';
import { getPool } from '../../../utils/db.js';
import { getStorage } from '../../../utils/storage.js';
import { requireProjectOwner } from '../../../utils/require-owner.js';

/**
 * DELETE /api/projects/[id]
 *
 * Delete a project and clean up all associated object-storage assets and
 * LangGraph checkpoints. Cleanup happens in three steps:
 *   1. List + delete storage objects under `comics/${id}/` and `${id}/`
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
    // 1. Verify project exists
    const pool = getPool();
    const { rows } = await pool.query(
      'SELECT id, user_id FROM comic_projects WHERE id = $1',
      [projectId]
    );

    if (rows.length === 0) {
      setResponseStatus(event, 404);
      return fail('NOT_FOUND', 'Project not found');
    }

    // 2. Delete every storage object belonging to this project. Uploads live
    // under `comics/${projectId}/`, but rows written before the objects moved
    // into the `comics/` prefix store paths under `${projectId}/` at the
    // bucket root — delete both so no orphan object survives.
    const storage = getStorage();
    const prefixes = [`comics/${projectId}/`, `${projectId}/`];
    const keys: string[] = [];

    for (const prefix of prefixes) {
      try {
        const found = await storage.listKeys(prefix);
        for (const key of found) {
          if (!keys.includes(key)) keys.push(key);
        }
      } catch (err) {
        cleanupErrors.push({
          step: `storage_list:${prefix}`,
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    if (keys.length > 0) {
      try {
        await storage.remove(keys);
      } catch (err) {
        cleanupErrors.push({
          step: 'storage_delete',
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // 3. Delete LangGraph checkpoints
    try {
      await pool.query(
        'DELETE FROM langgraph_checkpoints WHERE thread_id = $1',
        [projectId]
      );
    } catch (err) {
      cleanupErrors.push({
        step: 'checkpoint_delete',
        message: err instanceof Error ? err.message : String(err),
      });
    }

    // 4. Delete project row
    try {
      await pool.query('DELETE FROM comic_projects WHERE id = $1', [projectId]);
    } catch (err) {
      setResponseStatus(event, 500);
      return fail(
        'DELETE_ERROR',
        err instanceof Error ? err.message : 'Unknown error',
        { partialCleanupErrors: cleanupErrors }
      );
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
