import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

// scripts/ sits one level below the repo root, so ../ is the root .env.
// Load root first (lower priority), then any local override if present.
config({ path: resolve(__dirname, '../.env') });
config({ path: resolve(__dirname, '../.env.local') });

if (process.env.DISABLE_REDIS === 'true') {
  console.log('[dev] DISABLE_REDIS=true, skipping Redis startup');
  process.exit(0);
}

const running = spawnSync('docker', [
  'ps', '-q', '-f', 'name=panelcraft-redis',
]).stdout.toString().trim();

if (running) {
  console.log('[dev] Redis already running');
  process.exit(0);
}

// Container may exist but be stopped (e.g. after a previous crash or manual stop).
// docker compose up would fail with a name-conflict error in that case.
const exists = spawnSync('docker', [
  'ps', '-aq', '-f', 'name=panelcraft-redis',
]).stdout.toString().trim();

console.log('[dev] Starting Redis...');
if (exists) {
  execSync('docker start panelcraft-redis', { stdio: 'inherit' });
} else {
  execSync('docker compose up -d redis', { stdio: 'inherit' });
}

// Poll for readiness. Prefer the Docker healthcheck status when available;
// fall back to a direct redis-cli ping for containers created before the
// healthcheck was added to docker-compose.yml (no healthcheck = empty status).
let ready = false;
for (let i = 0; i < 30; i++) {
  const inspect = spawnSync('docker', [
    'inspect', '--format', '{{.State.Health.Status}}', 'panelcraft-redis',
  ]);
  const status = inspect.stdout.toString().trim();

  if (status === 'healthy') {
    ready = true;
    break;
  }

  if (status === 'unhealthy') {
    console.error('[dev] Redis container is unhealthy — run: docker logs panelcraft-redis');
    process.exit(1);
  }

  // No healthcheck configured on this container — ping directly instead.
  if (status === '' || status === '<no value>') {
    const ping = spawnSync('docker', ['exec', 'panelcraft-redis', 'redis-cli', 'ping']);
    if (ping.stdout.toString().trim() === 'PONG') {
      ready = true;
      break;
    }
  }

  execSync('sleep 1');
}

if (!ready) {
  console.error('[dev] Redis did not become ready in time');
  process.exit(1);
}

console.log('[dev] Redis ready');
