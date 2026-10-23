import { describe, expect, it, vi } from 'vitest';
import {
  connectQueueWithRetry,
  handleRedisUnavailable,
  REDIS_CONNECT_INITIAL_DELAY_MS,
  REDIS_CONNECT_MAX_ATTEMPTS,
  REDIS_CONNECT_MAX_DELAY_MS,
  shouldAttemptRedisConnect,
  shouldFailWithoutRedis,
} from '../server/utils/redis-connect.js';

interface FakeQueue {
  id: number;
  close: ReturnType<typeof vi.fn>;
  detach: ReturnType<typeof vi.fn>;
  waitUntilReady: ReturnType<typeof vi.fn>;
}

let nextQueueId = 0;

/**
 * A queue whose `waitUntilReady` rejects `failures` times before resolving.
 * Each queue is used for exactly one attempt, so failures > 0 means the
 * attempt fails and the queue is closed.
 */
function makeFakeQueue(failures = 0): FakeQueue {
  let remaining = failures;
  const queue = {
    id: ++nextQueueId,
    close: vi.fn().mockResolvedValue(undefined),
    detach: vi.fn(),
    waitUntilReady: vi.fn(() => {
      if (remaining > 0) {
        remaining -= 1;
        return Promise.reject(new Error(`ECONNREFUSED ${queue.id}`));
      }
      return Promise.resolve();
    }),
  };
  return queue;
}

type Mock = ReturnType<typeof vi.fn>;

function makeOptions(
  queues: FakeQueue[],
  overrides: {
    maxAttempts?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    sleep?: Mock;
    onRetry?: Mock;
  } = {}
) {
  let index = 0;
  return {
    create: vi.fn(() => queues[index++]!),
    waitUntilReady: (q: FakeQueue) => q.waitUntilReady(),
    attachErrorSink: (q: FakeQueue) => q.detach,
    close: (q: FakeQueue) => q.close(),
    sleep: overrides.sleep ?? vi.fn().mockResolvedValue(undefined),
    ...(overrides.maxAttempts !== undefined && {
      maxAttempts: overrides.maxAttempts,
    }),
    ...(overrides.initialDelayMs !== undefined && {
      initialDelayMs: overrides.initialDelayMs,
    }),
    ...(overrides.maxDelayMs !== undefined && {
      maxDelayMs: overrides.maxDelayMs,
    }),
    onRetry: overrides.onRetry ?? vi.fn(),
  };
}

describe('connectQueueWithRetry', () => {
  it('succeeds on the first attempt without sleeping or closing', async () => {
    const queue = makeFakeQueue();
    const sleep = vi.fn().mockResolvedValue(undefined);
    const options = makeOptions([queue], { sleep });

    const result = await connectQueueWithRetry(options);

    expect(result).toEqual({ queue, attempts: 1 });
    expect(options.create).toHaveBeenCalledTimes(1);
    expect(queue.waitUntilReady).toHaveBeenCalledTimes(1);
    expect(queue.close).not.toHaveBeenCalled();
    expect(queue.detach).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it('retries with backoff, closes each failed queue once, and detaches on success', async () => {
    const queues = [
      makeFakeQueue(1),
      makeFakeQueue(1),
      makeFakeQueue(1),
      makeFakeQueue(1),
      makeFakeQueue(1),
      makeFakeQueue(), // succeeds on the sixth attempt
    ];
    const sleep = vi.fn().mockResolvedValue(undefined);
    const onRetry = vi.fn();
    const options = makeOptions(queues, {
      sleep,
      onRetry,
      maxAttempts: 6,
      initialDelayMs: 10,
      maxDelayMs: 25,
    });

    const result = await connectQueueWithRetry(options);

    expect(result.queue).toBe(queues[5]!);
    expect(result.attempts).toBe(6);
    expect(options.create).toHaveBeenCalledTimes(6);

    // Every failed queue is closed exactly once; the successful one is not.
    for (const q of queues.slice(0, 5)) {
      expect(q.close).toHaveBeenCalledTimes(1);
    }
    expect(queues[5]!.close).not.toHaveBeenCalled();
    expect(queues[5]!.detach).toHaveBeenCalledTimes(1);

    // Bounded exponential backoff: 10, 20, 40 -> capped at 25, 25, 25.
    expect(sleep.mock.calls.map((call) => call[0])).toEqual([
      10, 20, 25, 25, 25,
    ]);
    expect(onRetry.mock.calls.map((call) => call[0])).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it('rejects after maxAttempts with the attempt count and closes every queue', async () => {
    const queues = [makeFakeQueue(1), makeFakeQueue(1), makeFakeQueue(1)];
    const sleep = vi.fn().mockResolvedValue(undefined);
    const options = makeOptions(queues, { sleep, maxAttempts: 3 });

    await expect(connectQueueWithRetry(options)).rejects.toThrow(
      /Redis unreachable after 3 attempts:/
    );

    expect(options.create).toHaveBeenCalledTimes(3);
    for (const q of queues) {
      expect(q.close).toHaveBeenCalledTimes(1);
    }
    // No sleep after the final failed attempt.
    expect(sleep).toHaveBeenCalledTimes(2);
    expect(options.onRetry).toHaveBeenCalledTimes(2);
  });

  it('uses the default constants when options omit them', async () => {
    expect(REDIS_CONNECT_MAX_ATTEMPTS).toBe(30);
    expect(REDIS_CONNECT_INITIAL_DELAY_MS).toBe(250);
    expect(REDIS_CONNECT_MAX_DELAY_MS).toBe(2000);

    const queues = Array.from({ length: REDIS_CONNECT_MAX_ATTEMPTS }, () =>
      makeFakeQueue(1)
    );
    const sleep = vi.fn().mockResolvedValue(undefined);
    const options = makeOptions(queues, { sleep });

    let rejection: unknown;
    try {
      await connectQueueWithRetry(options);
    } catch (error) {
      rejection = error;
    }
    expect(rejection).toBeInstanceOf(Error);
    const error = rejection as Error & { cause?: unknown };
    expect(error.message).toMatch(/Redis unreachable after 30 attempts:/);

    // All 30 attempts were made and every failed queue was closed once.
    expect(options.create).toHaveBeenCalledTimes(30);
    for (const q of queues) {
      expect(q.close).toHaveBeenCalledTimes(1);
    }

    // Default backoff: 250, 500, 1000, then 2000 (capped) for the rest —
    // 29 sleeps, none after the final failed attempt.
    expect(sleep.mock.calls.map((call) => call[0])).toEqual([
      250, 500, 1000, ...Array<number>(26).fill(2000),
    ]);
    expect(sleep).toHaveBeenCalledTimes(29);

    // The terminal rejection keeps the last attempt's error as its cause.
    expect(error.cause).toBeInstanceOf(Error);
    expect((error.cause as Error).message).toBe(
      `ECONNREFUSED ${queues[29]!.id}`
    );
  });
  it('rejects with the abort error when isStopped is true before the first attempt, without creating a queue', async () => {
    const queue = makeFakeQueue();
    const options = makeOptions([queue]);
    options.isStopped = vi.fn(() => true);

    await expect(connectQueueWithRetry(options)).rejects.toThrow(
      'Redis connect aborted: server shutting down'
    );

    expect(options.create).not.toHaveBeenCalled();
    expect(queue.close).not.toHaveBeenCalled();
  });

  it('aborts after one failed attempt when isStopped becomes true, closing that queue once', async () => {
    const queues = [makeFakeQueue(1), makeFakeQueue(1)];
    const options = makeOptions(queues);
    let stopped = false;
    options.isStopped = vi.fn(() => stopped);

    const pending = connectQueueWithRetry(options);
    // Flip the stop flag after the first failed attempt's sleep.
    options.sleep.mockImplementation(() => {
      stopped = true;
      return Promise.resolve();
    });

    await expect(pending).rejects.toThrow(
      'Redis connect aborted: server shutting down'
    );

    expect(options.create).toHaveBeenCalledTimes(1);
    expect(queues[0]!.close).toHaveBeenCalledTimes(1);
    expect(queues[1]!.close).not.toHaveBeenCalled();
  });
});

describe('handleRedisUnavailable', () => {
  it('logs once and exits with 1 in production', () => {
    const logError = vi.fn();
    const exit = vi.fn();

    const result = handleRedisUnavailable(new Error('ECONNREFUSED 127.0.0.1:6379'), {
      env: { NODE_ENV: 'production' },
      logError,
      exit,
    });

    expect(result).toBe('fallback');
    expect(logError).toHaveBeenCalledTimes(1);
    expect(logError).toHaveBeenCalledWith(
      expect.stringContaining(
        '[Init] Redis unreachable in production, exiting so the pod restarts:'
      )
    );
    expect(logError).toHaveBeenCalledWith(expect.stringContaining('ECONNREFUSED'));
    expect(exit).toHaveBeenCalledTimes(1);
    expect(exit).toHaveBeenCalledWith(1);
  });

  it('returns fallback without exiting outside production', () => {
    const logError = vi.fn();
    const exit = vi.fn();

    for (const NODE_ENV of ['development', 'test', undefined]) {
      const result = handleRedisUnavailable(new Error('boom'), {
        env: NODE_ENV === undefined ? {} : { NODE_ENV },
        logError,
        exit,
      });
      expect(result).toBe('fallback');
    }

    expect(logError).not.toHaveBeenCalled();
    expect(exit).not.toHaveBeenCalled();
  });

  it('defaults to process.env.NODE_ENV', () => {
    const previous = process.env.NODE_ENV;
    const logError = vi.fn();
    const exit = vi.fn();
    try {
      process.env.NODE_ENV = 'production';
      expect(
        handleRedisUnavailable(new Error('boom'), { logError, exit })
      ).toBe('fallback');
      expect(exit).toHaveBeenCalledWith(1);
      expect(logError).toHaveBeenCalledTimes(1);

      logError.mockClear();
      exit.mockClear();
      process.env.NODE_ENV = 'development';
      expect(
        handleRedisUnavailable(new Error('boom'), { logError, exit })
      ).toBe('fallback');
      expect(exit).not.toHaveBeenCalled();
      expect(logError).not.toHaveBeenCalled();
    } finally {
      if (previous === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previous;
      }
    }
  });
});

describe('shouldFailWithoutRedis', () => {
  it('fails hard in production and falls back outside production', () => {
    expect(shouldFailWithoutRedis({ NODE_ENV: 'production' })).toBe(true);
    expect(shouldFailWithoutRedis({ NODE_ENV: 'test' })).toBe(false);
    expect(shouldFailWithoutRedis({ NODE_ENV: 'development' })).toBe(false);
    expect(shouldFailWithoutRedis({})).toBe(false);
  });

  it('defaults to process.env.NODE_ENV', () => {
    const previous = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      expect(shouldFailWithoutRedis()).toBe(true);
      process.env.NODE_ENV = 'development';
      expect(shouldFailWithoutRedis()).toBe(false);
    } finally {
      if (previous === undefined) {
        delete process.env.NODE_ENV;
      } else {
        process.env.NODE_ENV = previous;
      }
    }
  });
});

describe('shouldAttemptRedisConnect', () => {
  it('skips connection attempts when Redis is disabled', () => {
    expect(shouldAttemptRedisConnect('true')).toBe(false);
    expect(shouldAttemptRedisConnect(undefined)).toBe(true);
    expect(shouldAttemptRedisConnect('false')).toBe(true);
  });
});
