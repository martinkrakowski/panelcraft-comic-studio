import { Pool } from 'pg';

let pool: Pool | null = null;

/**
 * Lazily-created singleton `pg` Pool built from `DATABASE_URL`.
 *
 * The connection string is never logged or exposed; callers only receive the
 * configured pool (max 10 connections). Falls back to throwing a clear error
 * when `DATABASE_URL` is unset.
 */
export function getPool(): Pool {
  if (!pool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('Missing DATABASE_URL environment variable');
    }
    pool = new Pool({ connectionString: url, max: 10 });
  }
  return pool;
}

/**
 * Test hook: replace or clear the singleton pool. Pass `null` to reset the
 * singleton so the next `getPool()` call re-reads the environment.
 */
export function setPoolForTests(next: Pool | null): void {
  pool = next;
}
