import { defineNitroPlugin, useRuntimeConfig } from 'nitropack/runtime';
import { Queue } from 'bullmq';
import {
  ComicGenerationUseCase,
  LangGraphOrchestrationAdapter,
  ImageGenerationAdapter,
  GeminiImageCompositionAdapter,
  PgCheckpointer,
} from '@panelcraft/comic-generation';
import type {
  ImageGenerationPort,
  ImageCompositionPort,
  GeneratePanelCommand,
} from '@panelcraft/comic-generation';
import { PgProjectRepository } from '@panelcraft/comic-project-management';
import { BullMQJobQueueAdapter } from '../adapters/BullMQJobQueueAdapter.js';
import { XaiLLMClientAdapter } from '../adapters/XaiLLMClientAdapter.js';
import { initComicWorker } from '../workers/comic-worker.js';
import type { JobQueuePort } from '@panelcraft/comic-generation';
import type { Worker } from 'bullmq';
import { createLogger } from '@panelcraft/shared';
import { getPool } from '../utils/db.js';
import { getStorage } from '../utils/storage.js';
import { getMediaUrls } from '../utils/media-urls.js';
import {
  connectQueueWithRetry,
  shouldAttemptRedisConnect,
  shouldFailWithoutRedis,
} from '../utils/redis-connect.js';

/**
 * Nitro server initialization plugin.
 * Bootstraps infrastructure on startup:
 * - Redis/BullMQ queue and worker for async comic generation
 * - Domain repositories and use cases
 * - Graceful shutdown hooks for connection cleanup
 */
export default defineNitroPlugin(async (nitroApp) => {
  const config = useRuntimeConfig();
  const redisPort = Number.parseInt(config.redisPort, 10);
  if (!Number.isInteger(redisPort) || redisPort < 1 || redisPort > 65535)
    throw new Error(`Invalid redisPort: ${config.redisPort}`);

  const logger = createLogger('API');
  const redisConnection = { host: config.redisHost, port: redisPort };
  const projectRepo = new PgProjectRepository(getPool());
  const storage = getStorage();
  const mediaUrls = getMediaUrls();
  const checkpointer = new PgCheckpointer(getPool());

  let bullMQQueue: Queue | null = null;
  let jobQueueAdapter: JobQueuePort = {
    add: async () => {
      logger.warn('[Init] Job queue not available (Redis disabled)');
    },
  };

  const isRedisDisabled = !shouldAttemptRedisConnect(config.disableRedis);

  if (!isRedisDisabled) {
    // BullMQ connects lazily — new Queue() never throws on connection failure,
    // it only throws on invalid config (e.g. non-numeric port). ECONNREFUSED
    // surfaces later when the queue or worker first interact with Redis.
    // connectQueueWithRetry forces eager connection checks so failures are
    // visible at startup, retrying with bounded exponential backoff until Redis
    // is up instead of handing the process a stub queue that drops jobs.
    try {
      const { queue, attempts } = await connectQueueWithRetry({
        create: () =>
          new Queue('comic-generation-queue', {
            connection: {
              ...redisConnection,
              // Fail fast per attempt: one immediate retry then give up, so a
              // dead IORedis client never floods the log. Overall retries are
              // owned by connectQueueWithRetry (fresh Queue per attempt).
              retryStrategy: (times: number) => (times >= 1 ? null : 100),
              // Suppress unhandled IORedis error events emitted during the
              // retry window before waitUntilReady() rejects — these bypass
              // try-catch.
              enableOfflineQueue: false,
            },
          }),
        waitUntilReady: (q) => q.waitUntilReady(),
        // Absorb IORedis 'error' events that fire before waitUntilReady()
        // rejects. Without this listener, Node.js throws an unhandled
        // EventEmitter error. Use a named handler so we can remove only this
        // listener afterwards, preserving any other error handling
        // BullMQ/IORedis attaches internally.
        attachErrorSink: (q) => {
          const suppressInitErrors = () => undefined;
          q.on('error', suppressInitErrors);
          return () => q.off('error', suppressInitErrors);
        },
        close: (q) => q.close(),
        onRetry: (attempt, error) =>
          logger.warn(
            `[Init] Redis connect attempt ${attempt} failed, retrying: ${String(error)}`
          ),
      });
      bullMQQueue = queue;
      jobQueueAdapter = new BullMQJobQueueAdapter(queue);
      logger.info(
        `[Init] Redis connection verified, job queue ready (attempt ${attempts})`
      );
    } catch (error) {
      if (shouldFailWithoutRedis(process.env)) {
        // In production an unreachable Redis is fatal: fail startup so
        // Kubernetes restarts the pod rather than silently serving a stub
        // queue that drops jobs.
        throw error;
      }
      logger.warn(
        `[Init] Redis unreachable, falling back to stub queue: ${String(error)}`
      );
      bullMQQueue = null;
    }
  } else {
    logger.warn('[Init] Redis disabled via DISABLE_REDIS env var');
  }

  const llmClient = new XaiLLMClientAdapter();

  // Image generation: in mock mode return placeholder buffers/URLs without
  // hitting any external API. In production mode wire the real xAI-backed
  // adapter — previously this branch threw unconditionally, which made
  // every generation request fail with a 5xx in non-mock environments.
  const imageGenPort: ImageGenerationPort =
    process.env.USE_MOCK_IMAGE === 'true'
      ? {
          generatePanel: async (command: GeneratePanelCommand) => {
            await new Promise((r) => setTimeout(r, 500));
            return `https://example.com/panels/${command.panelNumber || 1}.png`;
          },
          generateCover: async () => Buffer.from(''),
          generatePreview: async () => Buffer.from(''),
        }
      : new ImageGenerationAdapter();

  // Final-composition adapter is opt-in. Gated by FEATURE_FINAL_COMPOSITION
  // because the endpoint is hidden behind the same flag and because the
  // adapter assumes GOOGLE_GENERATIVE_AI_API_KEY is set. When the flag is
  // off we pass `null` to the worker so any stray compose-final-page job
  // (e.g. queued before the flag was disabled) surfaces a descriptive
  // error instead of dispatching to an unconfigured backend.
  const imageCompositionPort: ImageCompositionPort | null =
    process.env.FEATURE_FINAL_COMPOSITION === 'true'
      ? new GeminiImageCompositionAdapter()
      : null;

  const langGraphAdapter = new LangGraphOrchestrationAdapter(
    imageGenPort,
    llmClient,
    projectRepo,
    logger,
    storage,
    mediaUrls,
    checkpointer
  );
  const comicUseCase = new ComicGenerationUseCase(
    projectRepo,
    jobQueueAdapter,
    logger
  );

  // Inject dependencies into request context (Nitro event.context pattern)
  nitroApp.hooks.hook('request', (event) => {
    event.context = event.context || {};
    event.context.comicUseCase = comicUseCase;
    event.context.llmClient = llmClient;
    event.context.imageGenerationClient = imageGenPort;
  });

  let worker: Worker | undefined;
  if (bullMQQueue) {
    worker = initComicWorker(
      langGraphAdapter,
      projectRepo,
      bullMQQueue,
      logger,
      storage,
      mediaUrls,
      imageGenPort,
      llmClient,
      imageCompositionPort
    );
  }

  // Gracefully close BullMQ connections on server shutdown
  nitroApp.hooks.hook('close', async () => {
    if (bullMQQueue) {
      logger.info('[BullMQ] Closing worker and queue connections...');
      const results = await Promise.allSettled([
        worker?.close(),
        bullMQQueue.close(),
      ]);
      const rejected = results.filter((r) => r.status === 'rejected');
      if (rejected.length > 0) {
        logger.error(`[BullMQ] Shutdown errors: ${rejected.length} failure(s)`);
      }
      logger.info('[BullMQ] Connections closed.');
    }
    // After the worker has drained (its last save() needs the pool), and
    // whether or not Redis was enabled.
    try {
      await getPool().end();
    } catch (err) {
      logger.error(
        `[Postgres] Pool shutdown failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  });
});
