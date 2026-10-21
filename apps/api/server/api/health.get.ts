import { defineEventHandler } from 'h3';

/**
 * GET /api/health
 *
 * Liveness probe for Kubernetes. Returns 200 immediately without touching
 * Redis, Postgres, object storage or any other external service, and without requiring
 * auth — it should never hang or fail just because a dependency is down.
 */
export default defineEventHandler(() => {
  return { ok: true };
});
