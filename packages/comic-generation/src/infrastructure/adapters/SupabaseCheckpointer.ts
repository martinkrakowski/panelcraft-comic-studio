/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseCheckpointSaver } from '@langchain/langgraph';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * `SupabaseCheckpointer` is a persistent checkpoint saver for LangGraph.js workflows
 * that implements the `BaseCheckpointSaver` interface.
 *
 * It stores LangGraph checkpoint objects and execution metadata in the `langgraph_checkpoints` Supabase table.
 * This enables suspending, resuming, and rolling back stateful comic generation agent steps
 * across API processes.
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
export class SupabaseCheckpointer extends BaseCheckpointSaver {
  private supabase: SupabaseClient;

  /**
   * Initializes a new instance of the `SupabaseCheckpointer` class.
   *
   * @param supabase - The authenticated Supabase Client instance used to query the db.
   */
  constructor(supabase: SupabaseClient) {
    super();
    this.supabase = supabase;
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
      parent_id: checkpoint?.parent_id,
      created_at: new Date().toISOString(),
    };

    // Retry upsert up to 3 times on transient errors
    for (let attempt = 1; attempt <= 3; attempt++) {
      const { error } = await this.supabase
        .from('langgraph_checkpoints')
        .upsert(record, { onConflict: 'thread_id,checkpoint_id' });

      if (!error) return config;
      if (attempt === 3)
        throw new Error(
          `Checkpoint save failed after 3 attempts: ${error.message}`
        );
      await new Promise((resolve) => setTimeout(resolve, 100 * attempt)); // Backoff
    }
    return config;
  }

  /**
   * Retrieves the latest checkpoint tuple for the configured thread.
   *
   * @param config - The LangGraph configuration object. Must contain `configurable.thread_id`.
   * @returns A promise resolving to the CheckpointTuple if found, or undefined if no checkpoint is stored yet.
   * @throws {Error} If `thread_id` is missing or if the database query fails.
   */
  async getTuple(config: any): Promise<any> {
    const threadId = config?.configurable?.thread_id;
    if (!threadId) throw new Error('thread_id required in config');

    const { data, error } = await this.supabase
      .from('langgraph_checkpoints')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return undefined;
      throw new Error(`Checkpoint fetch failed: ${error.message}`);
    }

    return data
      ? {
          checkpoint: data.checkpoint,
          metadata: data.metadata,
          config: {
            configurable: {
              thread_id: data.thread_id,
              checkpoint_id: data.checkpoint_id,
            },
          },
          parentConfig: data.parent_id
            ? {
                configurable: {
                  thread_id: data.thread_id,
                  checkpoint_id: data.parent_id,
                },
              }
            : undefined,
        }
      : undefined;
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

    let query = this.supabase
      .from('langgraph_checkpoints')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false });

    if (options?.before?.configurable?.checkpoint_id) {
      const beforeCheckpointId = options.before.configurable.checkpoint_id;
      // Validate that the before checkpoint exists
      const { data: beforeData, error: beforeError } = await this.supabase
        .from('langgraph_checkpoints')
        .select('created_at')
        .eq('thread_id', threadId)
        .eq('checkpoint_id', beforeCheckpointId)
        .single();

      if (beforeError || !beforeData) {
        throw new Error(
          `Before checkpoint ${beforeCheckpointId} not found for thread ${threadId}`
        );
      }
      query = query.lt('created_at', beforeData.created_at);
    }

    if (options?.limit) query = query.limit(options.limit);

    const { data, error } = await query;
    if (error) throw new Error(`Checkpoint list failed: ${error.message}`);

    for (const row of data || []) {
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
    await this.supabase
      .from('langgraph_checkpoints')
      .delete()
      .eq('thread_id', threadId);
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
