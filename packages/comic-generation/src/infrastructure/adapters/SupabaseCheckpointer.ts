/* eslint-disable @typescript-eslint/no-explicit-any */
import { BaseCheckpointSaver } from '@langchain/langgraph';
import type { SupabaseClient } from '@supabase/supabase-js';

export class SupabaseCheckpointer extends BaseCheckpointSaver {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    super();
    this.supabase = supabase;
  }

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
