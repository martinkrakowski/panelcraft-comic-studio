# Deployment Checklist

## Environment flags

These flags default to safe local-dev values. Each must be explicitly set before deploying to any non-local environment.

| Flag             | Local default           | Production requirement                                                    |
| ---------------- | ----------------------- | ------------------------------------------------------------------------- |
| `DISABLE_REDIS`  | `true`                  | Set to `false`; ensure Redis is reachable at `REDIS_HOST:REDIS_PORT`      |
| `USE_MOCK_IMAGE` | `false`                 | Confirm `XAI_API_KEY` is set and valid                                    |
| `CORS_ORIGIN`    | `http://localhost:3000` | Set to actual domain(s), comma-separated (e.g. `https://app.example.com`) |

## Required environment variables

All secrets live in the root `.env` (local) or your environment's secret manager (staging/production). `NEXT_PUBLIC_*` vars belong in `apps/web/.env.local` or the web app's build environment.

### API (`apps/api`)

| Variable                    | Required         | Notes                                                                                       |
| --------------------------- | ---------------- | ------------------------------------------------------------------------------------------- |
| `SUPABASE_URL`              | Yes              | Project URL from Supabase dashboard                                                         |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes              | Service role key — never expose to the browser                                              |
| `SUPABASE_ANON_KEY`         | Yes              | Anon key for RLS-scoped client operations                                                   |
| `XAI_API_KEY`               | Yes              | xAI Grok Imagine API key for image generation                                               |
| `CORS_ORIGIN`               | Yes              | Comma-separated list of allowed origins                                                     |
| `DISABLE_REDIS`             | No               | Must be explicitly set to `false` to enable the job queue; omitting it is treated as `true` |
| `REDIS_HOST`                | If Redis enabled | Defaults to `localhost`                                                                     |
| `REDIS_PORT`                | If Redis enabled | Defaults to `6379`                                                                          |
| `PORT`                      | No               | API server port, defaults to `3001`                                                         |
| `LANGCHAIN_API_KEY`         | No               | LangSmith tracing; omit to disable                                                          |
| `LANGCHAIN_TRACING_V2`      | No               | Set to `true` to enable LangSmith traces                                                    |

### Web (`apps/web`)

| Variable              | Required | Notes                                                       |
| --------------------- | -------- | ----------------------------------------------------------- |
| `NEXT_PUBLIC_API_URL` | Yes      | Full URL of the API server (e.g. `https://api.example.com`) |
| `NEXT_PUBLIC_APP_URL` | Yes      | Full URL of the web app (e.g. `https://app.example.com`)    |

## Local development with Redis

Redis is disabled by default (`DISABLE_REDIS=true`). To enable the job queue locally:

1. Set `DISABLE_REDIS=false` in your root `.env`
2. Confirm `REDIS_HOST=localhost` and `REDIS_PORT=6379` are set (or rely on defaults)
3. Run `yarn dev` — the dev script starts the Docker container automatically before turbo

To start Redis independently (e.g. for running tests without the dev server):

```bash
docker compose up -d redis
```
