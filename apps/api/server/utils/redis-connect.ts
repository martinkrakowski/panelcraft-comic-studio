/**
 * Redis connection helpers for API startup.
 *
 * BullMQ connects lazily: `new Queue()` never fails on a dead Redis, it only
 * fails once work touches the connection. `connectQueueWithRetry` forces an
 * eager connection check per attempt and retries with bounded exponential
 * backoff, so a pod that boots before Redis converges once Redis is available
 * instead of silently holding a stub queue for the life of the process.
 */

export const REDIS_CONNECT_MAX_ATTEMPTS = 30;
export const REDIS_CONNECT_INITIAL_DELAY_MS = 250;
export const REDIS_CONNECT_MAX_DELAY_MS = 2000;

export interface ConnectQueueOptions<Q> {
  /** Build a fresh queue instance for one connection attempt. */
  create: () => Q;
  /** Resolve once the queue's connection is ready (rejects on failure). */
  waitUntilReady: (q: Q) => Promise<unknown>;
  /** Attach an error sink before waiting; returns a function to detach it. */
  attachErrorSink: (q: Q) => () => void;
  /** Close a queue from a failed attempt. Must not reject (caller catches). */
  close: (q: Q) => Promise<unknown>;
  /** Injectable sleep for tests. Defaults to a real timer. */
  sleep?: (ms: number) => Promise<void>;
  /** Max connection attempts (default: `REDIS_CONNECT_MAX_ATTEMPTS`). */
  maxAttempts?: number;
  /** Backoff delay after the first failure (default: 250 ms). */
  initialDelayMs?: number;
  /** Backoff cap per wait (default: 2 000 ms). */
  maxDelayMs?: number;
  /** Called with each failed attempt number and error before retrying. */
  onRetry?: (attempt: number, error: unknown) => void;
  /**
   * When provided and returning `true`, stop retrying (e.g. the server is
   * shutting down). Checked before each attempt and after each sleep; when
   * true the connect rejects with the abort error instead of continuing.
   */
  isStopped?: () => boolean;
}

/**
 * Connect to a queue with bounded exponential backoff, creating a fresh queue
 * per attempt.
 *
 * Resolves with the ready queue and the 1-based attempt number on which it
 * became ready. After `maxAttempts` failures it rejects with an Error whose
 * message includes the attempt count; every queue created by a failed attempt
 * is closed exactly once (errors during close are swallowed), so no queue ever
 * leaks from a failed attempt.
 */
export async function connectQueueWithRetry<Q>(
  opts: ConnectQueueOptions<Q>
): Promise<{ queue: Q; attempts: number }> {
  const maxAttempts = opts.maxAttempts ?? REDIS_CONNECT_MAX_ATTEMPTS;
  const initialDelayMs = opts.initialDelayMs ?? REDIS_CONNECT_INITIAL_DELAY_MS;
  const maxDelayMs = opts.maxDelayMs ?? REDIS_CONNECT_MAX_DELAY_MS;
  const sleep = opts.sleep ?? defaultSleep;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (opts.isStopped?.()) {
      throw new Error('Redis connect aborted: server shutting down');
    }
    let queue: Q | null = null;
    let detachErrorSink: (() => void) | null = null;
    try {
      queue = opts.create();
      detachErrorSink = opts.attachErrorSink(queue);
      await opts.waitUntilReady(queue);
      detachErrorSink();
      return { queue, attempts: attempt };
    } catch (error) {
      // Tear down the failed attempt: close first while the error sink is still
      // attached so errors emitted during teardown are absorbed, then remove
      // only that listener.
      if (queue) {
        await opts.close(queue).catch(() => undefined);
      }
      detachErrorSink?.();
      if (attempt >= maxAttempts) {
        throw new Error(
          `Redis unreachable after ${attempt} attempts: ${String(error)}`,
          { cause: error }
        );
      }
      opts.onRetry?.(attempt, error);
      await sleep(backoffDelay(attempt, initialDelayMs, maxDelayMs));
      if (opts.isStopped?.()) {
        throw new Error('Redis connect aborted: server shutting down');
      }
    }
  }

  // Unreachable given the loop above always returns or throws; satisfies TS.
  throw new Error('Unexpected end of retry loop');
}

/** Bounded exponential backoff: initial * 2^(attempt-1), capped at maxDelayMs. */
function backoffDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number
): number {
  return Math.min(initialDelayMs * 2 ** (attempt - 1), maxDelayMs);
}

async function defaultSleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Whether a total Redis connection failure should crash startup.
 *
 * In production the server must fail fast so Kubernetes restarts the pod;
 * outside production the caller may fall back to the stub queue.
 */
export function shouldFailWithoutRedis(
  env: { NODE_ENV?: string } = process.env
): boolean {
  return env.NODE_ENV === 'production';
}

/**
 * Whether to attempt a Redis connection at all, given the runtime config's
 * `disableRedis` flag (`'true'` disables Redis).
 */
export function shouldAttemptRedisConnect(disableRedis: unknown): boolean {
  return disableRedis !== 'true';
}

/**
 * Handle a total Redis connection failure according to the environment.
 *
 * In production the process must terminate (`exit(1)`) so Kubernetes restarts
 * the pod — throwing from an async Nitro plugin is swallowed because Nitro does
 * not await plugin promises and the node-server preset's `unhandledRejection`
 * handler only logs. Outside production the caller may fall back to the stub
 * queue.
 *
 * Always returns `'fallback'` so callers can use it as a switch; in production
 * it only returns if the injected `exit` returned (tests) instead of exiting.
 */
export function handleRedisUnavailable(
  error: unknown,
  deps: {
    env?: { NODE_ENV?: string };
    logError: (msg: string) => void;
    exit?: (code: number) => never | void;
  }
): 'fallback' {
  if (shouldFailWithoutRedis(deps.env)) {
    deps.logError(
      '[Init] Redis unreachable in production, exiting so the pod restarts: ' +
        String(error)
    );
    const exit = deps.exit ?? ((code: number) => process.exit(code));
    exit(1);
    // Reachable only when `exit` returned (tests); production exits above.
    return 'fallback';
  }
  return 'fallback';
}
