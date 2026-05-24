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
import { InMemoryProjectRepository } from '@panelcraft/comic-project-management';
import { BullMQJobQueueAdapter } from '../adapters/BullMQJobQueueAdapter.js';
import { XaiLLMClientAdapter } from '../adapters/XaiLLMClientAdapter.js';
import { initComicWorker } from '../workers/comic-worker.js';
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
  const projectRepo = new InMemoryProjectRepository();
  const bullMQQueue = new Queue('comic-generation-queue', {
    connection: redisConnection,
  });
  const jobQueueAdapter = new BullMQJobQueueAdapter(bullMQQueue);
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

  const worker = initComicWorker(
    langGraphAdapter,
    projectRepo,
    bullMQQueue,
    logger,
    getSupabaseClient()
  );

  // Gracefully close BullMQ connections on server shutdown
  nitroApp.hooks.hook('close', async () => {
    logger.info('[BullMQ] Closing worker and queue connections...');
    const results = await Promise.allSettled([
      worker.close(),
      bullMQQueue.close(),
    ]);
    const rejected = results.filter((r) => r.status === 'rejected');
    if (rejected.length > 0) {
      logger.error('[BullMQ] Shutdown errors:', undefined, { rejected });
    }
    logger.info('[BullMQ] Connections closed.');
  });
});
