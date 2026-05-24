export default {
  srcDir: 'server',
  compatibilityDate: '2026-05-23',
  errorHandler: '~/utils/error',

  devServer: {
    port: 3001,
  },

  // Nitro defaults to port 3000 — set explicitly to match existing .env
  // Use useRuntimeConfig() in handlers for typed environment variables (preferred over raw process.env)
  runtimeConfig: {
    port: process.env.PORT ?? '3001',
    redisHost: process.env.REDIS_HOST ?? 'localhost',
    redisPort: process.env.REDIS_PORT ?? '6379',
  },

  cors: {
    origin: ['http://localhost:3000', 'http://10.10.0.220:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  },
};
