const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:3000'];

export default {
  srcDir: 'server',
  compatibilityDate: '2026-05-23',
  errorHandler: '~/utils/error',

  devServer: {
    port: 3001,
  },

  runtimeConfig: {
    port: process.env.PORT ?? '3001',
    redisHost: process.env.REDIS_HOST ?? 'localhost',
    redisPort: process.env.REDIS_PORT ?? '6379',
    disableRedis: process.env.DISABLE_REDIS ?? 'false',
    cors: {
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    },
  },
};
