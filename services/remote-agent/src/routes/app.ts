import { execSync } from 'child_process';
import { Router } from 'express';
import { existsSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { WORKSPACE_ROOT } from '../config';

const WORKSPACE_BACKUP_PATH = '/opt/workspace-backup.tar.gz';

const router = Router();

interface Pm2Process {
  name: string;
  pid: number | null;
  pm2_env?: { status?: string };
}

function pm2(command: string): string {
  return execSync(`pm2 ${command}`, { encoding: 'utf-8', timeout: 60_000 });
}

export function startApp(): void {
  console.log('Starting custom-app via PM2...');
  pm2('start /app/ecosystem.config.cjs');
  console.log('PM2 started custom-app');
}

// POST /app/rebuild — build from source, then restart
router.post('/rebuild', (_req, res) => {
  try {
    console.log('Building custom-app...');
    const buildOutput = execSync('npm run build', {
      cwd: WORKSPACE_ROOT,
      timeout: 60_000,
      encoding: 'utf-8',
    });
    console.log('Build complete:', buildOutput);

    console.log('Restarting via PM2...');
    pm2('restart custom-app');
    console.log('Restart complete');

    res.json({ success: true, message: 'Rebuild and restart complete' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Rebuild failed: ${message}`);
    res.status(500).json({ error: message });
  }
});

// POST /app/restart — restart without rebuilding
router.post('/restart', (_req, res) => {
  try {
    console.log('Restarting via PM2...');
    pm2('restart custom-app');
    console.log('Restart complete');

    res.json({ success: true, message: 'Restart complete' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Restart failed: ${message}`);
    res.status(500).json({ error: message });
  }
});

// GET /app/status — check custom-app process status
router.get('/status', (_req, res) => {
  try {
    const output = pm2('jlist');
    const apps = JSON.parse(output) as Pm2Process[];
    const app = apps.find((a) => a.name === 'custom-app');
    res.json({
      running: app?.pm2_env?.status === 'online',
      pid: app?.pid ?? null,
      restarting: app?.pm2_env?.status === 'launching',
    });
  } catch {
    res.json({ running: false, pid: null, restarting: false });
  }
});

// GET /app/logs — retrieve PM2 logs from the custom-app process
router.get('/logs', async (req, res) => {
  const lines = Math.min(Number(req.query.lines) || 100, 5000);
  const type = (req.query.type as string) || 'all';

  const HOME = process.env.HOME || '/root';
  const outLogPath = `${HOME}/.pm2/logs/custom-app-out.log`;
  const errLogPath = `${HOME}/.pm2/logs/custom-app-error.log`;

  async function readTail(filePath: string, numLines: number): Promise<string> {
    try {
      const content = await readFile(filePath, 'utf-8');
      const allLines = content.split('\n');
      return allLines.slice(-numLines).join('\n');
    } catch {
      return '';
    }
  }

  const result: { stdout: string; stderr: string } = { stdout: '', stderr: '' };

  if (type === 'out' || type === 'all') {
    result.stdout = await readTail(outLogPath, lines);
  }
  if (type === 'error' || type === 'all') {
    result.stderr = await readTail(errLogPath, lines);
  }

  res.json(result);
});

// PUT /app/env — write environment variables to .env and restart the app
router.put('/env', async (req, res) => {
  try {
    const { variables } = req.body as { variables?: { key: string; value: string }[] };

    if (!Array.isArray(variables)) {
      res.status(400).json({ error: 'variables must be an array of { key, value }' });
      return;
    }

    const envContent = variables.map(({ key, value }) => `${key}=${value}`).join('\n') + '\n';

    const envPath = join(WORKSPACE_ROOT, '.env');
    await writeFile(envPath, envContent, 'utf-8');
    console.log(`Wrote ${variables.length} env vars to ${envPath}`);

    console.log('Restarting via PM2...');
    pm2('restart custom-app');
    console.log('Restart complete');

    res.json({ success: true, count: variables.length, restarted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Set env failed: ${message}`);
    res.status(500).json({ error: message });
  }
});

// POST /app/reset — reset workspace to initial state
router.post('/reset', (_req, res) => {
  try {
    if (!existsSync(WORKSPACE_BACKUP_PATH)) {
      res.status(500).json({ error: 'Workspace backup not found' });
      return;
    }

    console.log('Resetting workspace to initial state...');

    // Stop the app
    console.log('Stopping custom-app...');
    try {
      pm2('stop custom-app');
    } catch {
      console.log('custom-app was not running');
    }

    // Remove workspace and tmp contents
    console.log('Removing /workspace and /tmp contents...');
    execSync('rm -rf /workspace /tmp/*', { timeout: 30_000 });

    // Restore workspace from backup
    console.log('Restoring workspace from backup...');
    execSync(`tar xzf ${WORKSPACE_BACKUP_PATH} -C /`, { timeout: 60_000 });

    // Reset PostgreSQL database
    console.log('Resetting database...');
    try {
      execSync('su - postgres -c "dropdb --if-exists postgres"', { timeout: 10_000 });
      execSync('su - postgres -c "createdb -O postgres postgres"', { timeout: 10_000 });
    } catch (dbError) {
      console.warn('Database reset warning:', dbError instanceof Error ? dbError.message : String(dbError));
    }

    // Flush Redis
    console.log('Flushing Redis...');
    try {
      execSync('redis-cli FLUSHALL', { timeout: 5_000 });
    } catch (redisError) {
      console.warn('Redis flush warning:', redisError instanceof Error ? redisError.message : String(redisError));
    }

    // Restart the app
    console.log('Restarting custom-app...');
    pm2('restart custom-app');
    console.log('Workspace reset complete');

    res.json({ success: true, message: 'Workspace reset complete' });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Reset failed: ${message}`);
    res.status(500).json({ error: message });
  }
});

export default router;
