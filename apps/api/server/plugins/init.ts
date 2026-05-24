import { defineNitroPlugin, useRuntimeConfig } from 'nitropack/runtime';
import { Queue } from 'bullmq';
import {
  ComicGenerationUseCase,
  LangGraphOrchestrationAdapter,
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

  const imageGenPort: ImageGenerationPort =
    process.env.USE_MOCK_IMAGE === 'true'
      ? {
          generatePanel: async (command: GeneratePanelCommand) => {
            await new Promise((r) => setTimeout(r, 500));
            return `https://example.com/panels/${command.panelNumber || 1}.png`;
          },
        }
      : {
          generatePanel: async (_command: GeneratePanelCommand) => {
            throw new Error(
              'Real image generation adapter not yet implemented. Set USE_MOCK_IMAGE=true for development.'
            );
          },
        };

  const langGraphAdapter = new LangGraphOrchestrationAdapter(
    imageGenPort,
    llmClient,
    projectRepo,
    logger
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
  });

  const worker = initComicWorker(
    langGraphAdapter,
    projectRepo,
    bullMQQueue,
    logger
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
