export default {
  srcDir: 'server',
  compatibilityDate: '2026-05-23',
  errorHandler: '~/utils/error',

  // Nitro defaults to port 3000 — set explicitly to match existing .env
  // Use useRuntimeConfig() in handlers for typed environment variables (preferred over raw process.env)
  runtimeConfig: {
    port: process.env.PORT ?? '3001',
    redisHost: process.env.REDIS_HOST ?? 'localhost',
    redisPort: process.env.REDIS_PORT ?? '6379',
  },
}
