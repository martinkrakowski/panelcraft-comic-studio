/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseCheckpointSaver } from '@langchain/langgraph';
import type { Pool } from 'pg';

/**
 * `PgCheckpointer` is a persistent checkpoint saver for LangGraph.js workflows
 * that implements the `BaseCheckpointSaver` interface.
 *
 * It stores LangGraph checkpoint objects and execution metadata in the `langgraph_checkpoints` table
 * on plain Postgres (see db/migrations/001_init.sql).
 * This enables suspending, resuming, and rolling back stateful comic generation agent steps
 * across API processes.
 *
 * This is the plain-Postgres counterpart to `SupabaseCheckpointer`, mirroring its behaviour
 * method by method using parameterised SQL only. jsonb values are serialized with JSON.stringify
 * on write and come back already parsed by the pg driver.
 *
 * Database Schema Expectations:
 * The table `langgraph_checkpoints` must contain:
 * - `thread_id` (text, primary key part)
 * - `checkpoint_id` (text, primary key part)
 * - `checkpoint` (jsonb)
 * - `metadata` (jsonb)
 * - `parent_id` (text)
 * - `created_at` (timestamptz)
 */
export class PgCheckpointer extends BaseCheckpointSaver {
  /**
   * Initializes a new instance of the `PgCheckpointer` class.
   *
   * @param pool - A pg `Pool` used to query the database.
   */
  constructor(private readonly pool: Pool) {
    super();
  }

  /**
   * Persists a workflow checkpoint and its associated metadata.
   * Implements exponential backoff retry logic to handle transient DB issues.
   *
   * @param config - The LangGraph configuration object. Must contain `configurable.thread_id`.
   * @param checkpoint - The state checkpoint object to store. Must contain `id` (and optionally `parent_id`).
   * @param metadata - Execution metadata detailing the node execution and active runner.
   * @param _newVersions - Version details (unused/ignored by this checkpointer).
   * @returns A promise that resolves to the passed config object upon successful persistence.
   * @throws {Error} If `thread_id` or `checkpoint.id` is missing, or if database upserts fail after 3 retry attempts.
   */
  async put(
    config: any,
    checkpoint: any,
    metadata: any,
    _newVersions: any
  ): Promise<any> {
    const threadId = config?.configurable?.thread_id;
    if (!threadId) throw new Error('thread_id required in config');
    const checkpointId = checkpoint?.id;
    if (!checkpointId) throw new Error('checkpoint.id required');

    const record = {
      thread_id: threadId,
      checkpoint_id: checkpointId,
      checkpoint: JSON.parse(JSON.stringify(checkpoint)),
      metadata: JSON.parse(JSON.stringify(metadata)),
      parent_id: checkpoint?.parent_id ?? null,
      created_at: new Date().toISOString(),
    };

    const sql = `INSERT INTO langgraph_checkpoints (
        thread_id, checkpoint_id, checkpoint, metadata, parent_id, created_at
      )
      VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6)
      ON CONFLICT (thread_id, checkpoint_id) DO UPDATE SET
        checkpoint = EXCLUDED.checkpoint,
        metadata = EXCLUDED.metadata,
        parent_id = EXCLUDED.parent_id,
        created_at = EXCLUDED.created_at`;
    const params = [
      record.thread_id,
      record.checkpoint_id,
      JSON.stringify(record.checkpoint),
      JSON.stringify(record.metadata),
      record.parent_id,
      record.created_at,
    ];

    // Retry upsert up to 3 times on transient errors
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this.pool.query(sql, params);
        return config;
      } catch (error: any) {
        if (attempt === 3)
          throw new Error(
            `Checkpoint save failed after 3 attempts: ${error.message}`
          );
        await new Promise((resolve) => setTimeout(resolve, 100 * attempt)); // Backoff
      }
    }
    return config;
  }

  /**
   * Retrieves a checkpoint tuple for the configured thread.
   *
   * When the config includes an explicit `checkpoint_id`, that specific checkpoint is
   * returned; otherwise the newest checkpoint for the thread is returned.
   *
   * @param config - The LangGraph configuration object. Must contain `configurable.thread_id`.
   * @returns A promise resolving to the CheckpointTuple if found, or undefined if no checkpoint is stored yet.
   * @throws {Error} If `thread_id` is missing or if the database query fails.
   */
  async getTuple(config: any): Promise<any> {
    const threadId = config?.configurable?.thread_id;
    if (!threadId) throw new Error('thread_id required in config');

    const checkpointId = config?.configurable?.checkpoint_id;

    let result;
    try {
      if (checkpointId) {
        result = await this.pool.query(
          `SELECT * FROM langgraph_checkpoints
           WHERE thread_id = $1 AND checkpoint_id = $2
           ORDER BY created_at DESC
           LIMIT 1`,
          [threadId, checkpointId]
        );
      } else {
        result = await this.pool.query(
          `SELECT * FROM langgraph_checkpoints
           WHERE thread_id = $1
           ORDER BY created_at DESC
           LIMIT 1`,
          [threadId]
        );
      }
    } catch (error: any) {
      throw new Error(`Checkpoint fetch failed: ${error.message}`);
    }

    const row = result.rows[0];
    if (!row) return undefined;

    return {
      checkpoint: row.checkpoint,
      metadata: row.metadata,
      config: {
        configurable: {
          thread_id: row.thread_id,
          checkpoint_id: row.checkpoint_id,
        },
      },
      parentConfig: row.parent_id
        ? {
            configurable: {
              thread_id: row.thread_id,
              checkpoint_id: row.parent_id,
            },
          }
        : undefined,
    };
  }

  /**
   * Lists checkpoints for a given thread, matching filters like `before` or `limit`.
   *
   * @param config - The LangGraph configuration object. Must contain `configurable.thread_id`.
   * @param options - Listing options, such as cursor/checkpoint boundaries and row limits.
   * @returns An async generator yielding checkpoints.
   * @throws {Error} If `thread_id` is missing or if checkpoint queries fail.
   */
  async *list(config: any, options?: any): AsyncGenerator<any> {
    const threadId = config?.configurable?.thread_id;
    if (!threadId) throw new Error('thread_id required in config');

    let query = `SELECT * FROM langgraph_checkpoints WHERE thread_id = $1`;
    const params: any[] = [threadId];
    let paramIndex = 2;

    if (options?.before?.configurable?.checkpoint_id) {
      const beforeCheckpointId = options.before.configurable.checkpoint_id;
      // Validate that the before checkpoint exists
      let beforeResult;
      try {
        beforeResult = await this.pool.query(
          `SELECT created_at FROM langgraph_checkpoints
           WHERE thread_id = $1 AND checkpoint_id = $2`,
          [threadId, beforeCheckpointId]
        );
      } catch (error: any) {
        throw new Error(`Checkpoint list failed: ${error.message}`);
      }

      if (beforeResult.rows.length === 0) {
        throw new Error(
          `Before checkpoint ${beforeCheckpointId} not found for thread ${threadId}`
        );
      }
      query += ` AND created_at < $${paramIndex++}`;
      params.push(beforeResult.rows[0].created_at);
    }

    query += ` ORDER BY created_at DESC`;

    if (options?.limit) {
      query += ` LIMIT $${paramIndex++}`;
      params.push(options.limit);
    }

    let result;
    try {
      result = await this.pool.query(query, params);
    } catch (error: any) {
      throw new Error(`Checkpoint list failed: ${error.message}`);
    }

    for (const row of result.rows) {
      yield {
        checkpoint: row.checkpoint,
        metadata: row.metadata,
        config: {
          configurable: {
            thread_id: row.thread_id,
            checkpoint_id: row.checkpoint_id,
          },
        },
        parentConfig: row.parent_id
          ? {
              configurable: {
                thread_id: row.thread_id,
                checkpoint_id: row.parent_id,
              },
            }
          : undefined,
      };
    }
  }

  async putWrites(config: any, _writes: any, _taskId: string): Promise<any> {
    return config;
  }

  async deleteThread(config: any): Promise<void> {
    const threadId = config?.configurable?.thread_id;
    if (!threadId) return;
    await this.pool.query(
      `DELETE FROM langgraph_checkpoints WHERE thread_id = $1`,
      [threadId]
    );
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
