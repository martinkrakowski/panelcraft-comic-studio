import { defineEventHandler, setHeader, setResponseStatus } from 'h3';

export default defineEventHandler((event) => {
  // Set CORS headers
  setHeader(event, 'Access-Control-Allow-Origin', 'http://localhost:3000');
  setHeader(
    event,
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, PATCH, OPTIONS'
  );
  setHeader(
    event,
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );
  setHeader(event, 'Access-Control-Allow-Credentials', 'true');

  // Handle OPTIONS preflight requests
  if (event.method === 'OPTIONS') {
    setResponseStatus(event, 200);
    return '';
  }
});
