# syntax=docker/dockerfile:1.7

# ----------------------------------------------------------------------------
# Stage 1 — builder
# Installs all workspace deps, builds packages and apps via turbo.
# NEXT_PUBLIC_* values must be supplied as --build-arg; they're baked into
# the Next.js bundle here and cannot be changed at runtime.
# ----------------------------------------------------------------------------
FROM node:22-alpine AS builder

RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable

# Manifests + yarn config first for cacheable install layer
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn ./.yarn
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY packages/comic-generation/package.json ./packages/comic-generation/
COPY packages/comic-project-management/package.json ./packages/comic-project-management/

RUN yarn install --immutable

# Source
COPY . .

# Build args baked into the Next.js client bundle at build time
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

# Build arg baked into Nitro's runtimeConfig.cors at build time (varies by deploy)
ARG CORS_ORIGIN

# nitro.config.ts evaluates `process.env.X ?? <default>` at build time. These
# values must be present here so the resulting runtimeConfig has the right
# defaults — runtime .env overrides would not affect runtimeConfig.
# REDIS_HOST is the compose service name; REDIS_PORT and DISABLE_REDIS are
# fixed across all deploys.
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    CORS_ORIGIN=$CORS_ORIGIN \
    REDIS_HOST=redis \
    REDIS_PORT=6379 \
    DISABLE_REDIS=false

RUN yarn build

# ----------------------------------------------------------------------------
# Stage 2 — runner
# Minimal alpine + tini. Copies only what each app needs at runtime.
# ----------------------------------------------------------------------------
FROM node:22-alpine AS runner

RUN apk add --no-cache libc6-compat tini
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN addgroup -S -g 1001 nodejs && adduser -S -u 1001 -G nodejs nodejs

# Next.js standalone output (server.js + traced node_modules)
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nodejs:nodejs /app/apps/web/public ./apps/web/public

# Nitro built output (already self-contained)
COPY --from=builder --chown=nodejs:nodejs /app/apps/api/.output ./apps/api/.output

# Supervisor script: runs both processes, forwards signals, exits if either dies
COPY --chown=nodejs:nodejs <<'SH' /app/start.sh
#!/bin/sh
set -eu

term() {
  [ -n "${WEB_PID:-}" ] && kill -TERM "$WEB_PID" 2>/dev/null || true
  [ -n "${API_PID:-}" ] && kill -TERM "$API_PID" 2>/dev/null || true
  wait
}
trap term TERM INT

HOSTNAME=0.0.0.0 PORT=3000 node /app/apps/web/server.js &
WEB_PID=$!

PORT=3001 node /app/apps/api/.output/server/index.mjs &
API_PID=$!

wait -n
EXIT=$?
kill -TERM "$WEB_PID" "$API_PID" 2>/dev/null || true
wait
exit "$EXIT"
SH

RUN chmod +x /app/start.sh

USER nodejs

EXPOSE 3000 3001

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/app/start.sh"]
