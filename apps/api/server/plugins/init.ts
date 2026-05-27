import { defineNitroPlugin, useRuntimeConfig } from 'nitropack/runtime';
import { Queue } from 'bullmq';
import {
  ComicGenerationUseCase,
  LangGraphOrchestrationAdapter,
  ImageGenerationAdapter,
} from '@panelcraft/comic-generation';
import type {
  ImageGenerationPort,
  GeneratePanelCommand,
} from '@panelcraft/comic-generation';
import { SupabaseProjectRepository } from '@panelcraft/comic-project-management';
import { BullMQJobQueueAdapter } from '../adapters/BullMQJobQueueAdapter.js';
import { XaiLLMClientAdapter } from '../adapters/XaiLLMClientAdapter.js';
import { initComicWorker } from '../workers/comic-worker.js';
import type { JobQueuePort } from '@panelcraft/comic-generation';
import type { Worker } from 'bullmq';
import { createLogger } from '@panelcraft/shared';
import { getSupabaseClient } from '../utils/supabase.js';

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
  const projectRepo = new SupabaseProjectRepository(getSupabaseClient());

  let bullMQQueue: Queue | null = null;
  let jobQueueAdapter: JobQueuePort = {
    add: async () => {
      logger.warn('[Init] Job queue not available (Redis disabled)');
    },
  };

  const isRedisDisabled = config.disableRedis === 'true';

  if (!isRedisDisabled) {
    // BullMQ connects lazily — new Queue() never throws on connection failure,
    // it only throws on invalid config (e.g. non-numeric port). ECONNREFUSED
    // surfaces later when the queue or worker first interact with Redis.
    // waitUntilReady() forces an eager connection check so failures are visible
    // at startup rather than silently on the first job enqueue.
    try {
      bullMQQueue = new Queue('comic-generation-queue', {
        connection: {
          ...redisConnection,
          // Fail fast: one immediate retry then give up. Without this, IORedis
          // floods the log with ECONNREFUSED every second indefinitely.
          retryStrategy: (times: number) => (times >= 1 ? null : 100),
          // Suppress unhandled IORedis error events emitted during the retry
          // window before waitUntilReady() rejects — these bypass try-catch.
          enableOfflineQueue: false,
        },
      });
      // Absorb IORedis 'error' events that fire before waitUntilReady() rejects.
      // Without this listener, Node.js throws an unhandled EventEmitter error.
      // Use a named handler so we can remove only this listener afterwards,
      // preserving any other error handling BullMQ/IORedis attaches internally.
      const suppressInitErrors = () => undefined;
      bullMQQueue.on('error', suppressInitErrors);
      await bullMQQueue.waitUntilReady();
      bullMQQueue.off('error', suppressInitErrors);
      jobQueueAdapter = new BullMQJobQueueAdapter(bullMQQueue);
      logger.info('[Init] Redis connection verified, job queue ready');
    } catch (error) {
      logger.warn(
        `[Init] Redis unreachable, falling back to stub queue: ${String(error)}`
      );
      await bullMQQueue?.close().catch(() => undefined);
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

  const langGraphAdapter = new LangGraphOrchestrationAdapter(
    imageGenPort,
    llmClient,
    projectRepo,
    logger,
    getSupabaseClient()
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
      getSupabaseClient(),
      imageGenPort,
      llmClient
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
  });
});
