import { defineEventHandler, handleCors } from 'h3';
import type { HTTPMethod } from 'h3';
import { useRuntimeConfig } from 'nitropack/runtime';

/**
 * CORS Middleware for Nitro API server.
 * Handles CORS headers for all incoming requests and intercepts
 * OPTIONS preflight requests to return 204 No Content.
 */
export default defineEventHandler((event) => {
  const config = useRuntimeConfig();
  const corsConfig = config.cors || {
    origin: ['http://localhost:3000', 'http://10.10.0.220:3000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  };

  const didHandleCors = handleCors(event, {
    origin: corsConfig.origin,
    credentials: corsConfig.credentials,
    methods: corsConfig.methods as HTTPMethod[],
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
