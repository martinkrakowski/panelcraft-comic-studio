import { defineNitroPlugin, useRuntimeConfig } from 'nitropack/runtime'
import { Queue, Worker } from 'bullmq'
import { ComicGenerationUseCase, LangGraphOrchestrationAdapter } from '@panelcraft/comic-generation'
import { InMemoryProjectRepository } from '@panelcraft/comic-project-management'
import { BullMQJobQueueAdapter } from '../adapters/BullMQJobQueueAdapter.js'
import { XaiLLMClientAdapter } from '../adapters/XaiLLMClientAdapter.js'
import { initComicWorker } from '../workers/comic-worker.js'

/**
 * Nitro server initialization plugin.
 * Bootstraps infrastructure on startup:
 * - Redis/BullMQ queue and worker for async comic generation
 * - Domain repositories and use cases
 * - Graceful shutdown hooks for connection cleanup
 */
export default defineNitroPlugin(async (nitroApp) => {
  const config = useRuntimeConfig()
  const redisPort = Number.parseInt(config.redisPort, 10)
  if (!Number.isInteger(redisPort) || redisPort < 1 || redisPort > 65535)
    throw new Error(`Invalid redisPort: ${config.redisPort}`)

  const redisConnection = { host: config.redisHost, port: redisPort }
  const projectRepo = new InMemoryProjectRepository()
  const bullMQQueue = new Queue('comic-generation-queue', { connection: redisConnection })
  const jobQueueAdapter = new BullMQJobQueueAdapter(bullMQQueue)
  const llmClient = new XaiLLMClientAdapter()

  const imageGenPort = process.env.USE_MOCK_IMAGE === 'true' ? {
    generatePanel: async (opts: any) => {
      await new Promise((r) => setTimeout(r, 500))
      return `https://example.com/panels/${opts.panelNumber}.png`
    },
  } : {
    generatePanel: async (opts: any) => {
      throw new Error('Real image generation adapter not yet implemented. Set USE_MOCK_IMAGE=true for development.')
    },
  }

  const langGraphAdapter = new LangGraphOrchestrationAdapter(imageGenPort, llmClient, projectRepo)
  const comicUseCase = new ComicGenerationUseCase(projectRepo, jobQueueAdapter)

  // Inject dependencies into request context (Nitro event.context pattern)
  nitroApp.hooks.hook('request', (event) => {
    event.context = event.context || {}
    event.context.comicUseCase = comicUseCase
  })

  const worker = initComicWorker(langGraphAdapter, projectRepo, bullMQQueue)

  // Gracefully close BullMQ connections on server shutdown
  nitroApp.hooks.hook('close', async () => {
    console.log('[BullMQ] Closing worker and queue connections...')
    const results = await Promise.allSettled([
      worker.close(),
      bullMQQueue.close(),
    ])
    const rejected = results.filter((r) => r.status === 'rejected')
    if (rejected.length > 0) {
      console.error('[BullMQ] Shutdown errors:', rejected)
    }
    console.log('[BullMQ] Connections closed.')
  })
})
