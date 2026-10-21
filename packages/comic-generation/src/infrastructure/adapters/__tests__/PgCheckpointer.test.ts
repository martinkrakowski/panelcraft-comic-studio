import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { PgCheckpointer } from '../PgCheckpointer';

const databaseUrl = process.env.TEST_DATABASE_URL;

const suite = databaseUrl ? describe : describe.skip;

interface RunnableConfigLike {
  configurable: {
    thread_id: string;
    checkpoint_id?: string;
  };
}

function makeConfig(threadId: string, checkpointId?: string): RunnableConfigLike {
  return {
    configurable: {
      thread_id: threadId,
      ...(checkpointId ? { checkpoint_id: checkpointId } : {}),
    },
  };
}

function makeCheckpoint(
  id: string,
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    id,
    values: { messages: [{ type: 'human', content: 'hi' }] },
    ...overrides,
  };
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

suite('PgCheckpointer', () => {
  let checkpointer: PgCheckpointer;
  let pool: Pool;
  let adminPool: Pool;
  let schemaName: string;

  beforeEach(async () => {
    const url = process.env.TEST_DATABASE_URL!;
    schemaName = `test_${Math.random().toString(36).slice(2, 10)}`;

    adminPool = new Pool({ connectionString: url });
    await adminPool.query(`CREATE SCHEMA ${schemaName}`);

    pool = new Pool({
      connectionString: url,
      options: `-c search_path=${schemaName}`,
    });

    const migrationPath = fileURLToPath(
      new URL('../../../../../../db/migrations/001_init.sql', import.meta.url)
    );
    const migrationSql = readFileSync(migrationPath, 'utf8');
    await pool.query(migrationSql);

    checkpointer = new PgCheckpointer(pool);
  });

  afterEach(async () => {
    await pool.end();
    await adminPool.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
    await adminPool.end();
  });

  it('persists a checkpoint and returns it via getTuple', async () => {
    const threadId = randomUUID();
    const config = makeConfig(threadId);
    const checkpoint = makeCheckpoint(randomUUID());
    const metadata = { node: 'structureStory' };

    await checkpointer.put(config, checkpoint, metadata, {});

    const tuple = await checkpointer.getTuple(config);
    expect(tuple).toBeDefined();
    expect(tuple.checkpoint).toEqual(checkpoint);
    expect(tuple.metadata).toEqual(metadata);
    expect(tuple.config.configurable.thread_id).toBe(threadId);
    expect(tuple.config.configurable.checkpoint_id).toBe(checkpoint.id);
    expect(tuple.parentConfig).toBeUndefined();
  });

  it('upserts when putting the same checkpoint id twice', async () => {
    const threadId = randomUUID();
    const config = makeConfig(threadId);
    const checkpointId = randomUUID();

    await checkpointer.put(
      config,
      makeCheckpoint(checkpointId, { values: { count: 1 } }),
      { v: 1 },
      {}
    );
    await checkpointer.put(
      config,
      makeCheckpoint(checkpointId, { values: { count: 2 } }),
      { v: 2 },
      {}
    );

    const tuple = await checkpointer.getTuple(config);
    expect(tuple.checkpoint.values.count).toBe(2);
    expect(tuple.metadata.v).toBe(2);

    const rows = await pool.query(
      'SELECT * FROM langgraph_checkpoints WHERE checkpoint_id = $1',
      [checkpointId]
    );
    expect(rows.rowCount).toBe(1);
  });

  it('returns the newest of several checkpoints', async () => {
    const threadId = randomUUID();
    const config = makeConfig(threadId);
    const first = makeCheckpoint(randomUUID(), { values: { n: 1 } });
    const second = makeCheckpoint(randomUUID(), { values: { n: 2 } });
    const third = makeCheckpoint(randomUUID(), { values: { n: 3 } });

    await checkpointer.put(config, first, {}, {});
    await wait(10);
    await checkpointer.put(config, second, {}, {});
    await wait(10);
    await checkpointer.put(config, third, {}, {});

    const tuple = await checkpointer.getTuple(config);
    expect(tuple.config.configurable.checkpoint_id).toBe(third.id);
    expect(tuple.checkpoint.values.n).toBe(3);
  });

  it('getTuple honors an explicit checkpoint_id', async () => {
    const threadId = randomUUID();
    const config = makeConfig(threadId);
    const first = makeCheckpoint(randomUUID(), { values: { n: 1 } });
    const second = makeCheckpoint(randomUUID(), { values: { n: 2 } });
    const third = makeCheckpoint(randomUUID(), { values: { n: 3 } });

    await checkpointer.put(config, first, {}, {});
    await wait(10);
    await checkpointer.put(config, second, {}, {});
    await wait(10);
    await checkpointer.put(config, third, {}, {});

    const tuple = await checkpointer.getTuple(makeConfig(threadId, second.id));
    expect(tuple.config.configurable.checkpoint_id).toBe(second.id);
    expect(tuple.checkpoint.values.n).toBe(2);
  });

  it('lists newest-first, honors before and limit', async () => {
    const threadId = randomUUID();
    const config = makeConfig(threadId);
    const a = makeCheckpoint(randomUUID(), { values: { n: 1 } });
    const b = makeCheckpoint(randomUUID(), { values: { n: 2 } });
    const c = makeCheckpoint(randomUUID(), { values: { n: 3 } });
    const d = makeCheckpoint(randomUUID(), { values: { n: 4 } });

    await checkpointer.put(config, a, {}, {});
    await wait(10);
    await checkpointer.put(config, b, {}, {});
    await wait(10);
    await checkpointer.put(config, c, {}, {});
    await wait(10);
    await checkpointer.put(config, d, {}, {});

    const all: string[] = [];
    for await (const tuple of checkpointer.list(config)) {
      all.push(tuple.config.configurable.checkpoint_id);
    }
    expect(all).toEqual([d.id, c.id, b.id, a.id]);

    const beforeC: string[] = [];
    for await (const tuple of checkpointer.list(config, {
      before: makeConfig(threadId, c.id),
    })) {
      beforeC.push(tuple.config.configurable.checkpoint_id);
    }
    expect(beforeC).toEqual([b.id, a.id]);

    const limited: string[] = [];
    for await (const tuple of checkpointer.list(config, { limit: 2 })) {
      limited.push(tuple.config.configurable.checkpoint_id);
    }
    expect(limited).toEqual([d.id, c.id]);
  });

  it('deleteThread removes only that thread', async () => {
    const threadA = randomUUID();
    const threadB = randomUUID();
    const configA = makeConfig(threadA);
    const configB = makeConfig(threadB);

    await checkpointer.put(configA, makeCheckpoint(randomUUID()), {}, {});
    await wait(10);
    await checkpointer.put(configA, makeCheckpoint(randomUUID()), {}, {});
    await checkpointer.put(configB, makeCheckpoint(randomUUID()), {}, {});

    await checkpointer.deleteThread(configA);

    expect(await checkpointer.getTuple(configA)).toBeUndefined();
    expect(await checkpointer.getTuple(configB)).toBeDefined();
  });

  it('round-trips metadata and parent_id', async () => {
    const threadId = randomUUID();
    const config = makeConfig(threadId);
    const checkpoint = makeCheckpoint(randomUUID());
    const metadata = {
      run: 'run-123',
      node: 'generatePanel',
      activeRunner: 'worker-1',
    };

    await checkpointer.put(config, checkpoint, metadata, {});
    await wait(10);

    const child = makeCheckpoint(randomUUID(), { parent_id: checkpoint.id });
    await checkpointer.put(makeConfig(threadId), child, metadata, {});

    const tuple = await checkpointer.getTuple(config);
    expect(tuple.parentConfig?.configurable.checkpoint_id).toBe(checkpoint.id);
    expect(tuple.metadata).toEqual(metadata);
    expect(tuple.checkpoint.parent_id).toBe(checkpoint.id);
  });
});
