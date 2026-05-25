import { defineEventHandler, handleCors } from 'h3';
import type { HTTPMethod } from 'h3';
import { useRuntimeConfig } from 'nitropack/runtime';

/**
 * CORS Middleware for Nitro API server.
 * Handles CORS headers for all incoming requests and intercepts
 * OPTIONS preflight requests to return 204 No Content.
 */
export default defineEventHandler((event) => {
  const { cors } = useRuntimeConfig();
  if (!cors) throw new Error('[CORS] runtimeConfig.cors is not configured');

  const didHandleCors = handleCors(event, {
    origin: cors.origin,
    credentials: cors.credentials,
    methods: cors.methods as HTTPMethod[],
    allowHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    preflight: {
      statusCode: 204,
    },
  });

  if (didHandleCors) {
    event.node.res.statusCode = 204;
    event.node.res.end();
  }
});
