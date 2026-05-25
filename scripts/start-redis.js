import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawnSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

// scripts/ sits one level below the repo root, so ../ is the root .env.
// Load root first (lower priority), then any local override if present.
config({ path: resolve(__dirname, '../.env') });
config({ path: resolve(__dirname, '.env') });

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

console.log('[dev] Starting Redis...');
execSync('docker compose up -d redis', { stdio: 'inherit' });

// Poll container health rather than assuming redis-cli is installed locally
let ready = false;
for (let i = 0; i < 10; i++) {
  const result = spawnSync('docker', [
    'inspect', '--format', '{{.State.Health.Status}}', 'panelcraft-redis',
  ]);
  if (result.stdout.toString().trim() === 'healthy') {
    ready = true;
    break;
  }
  execSync('sleep 1');
}

if (!ready) {
  console.error('[dev] Redis did not become healthy in time');
  process.exit(1);
}

console.log('[dev] Redis ready');
