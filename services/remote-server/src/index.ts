import express from 'express';
import { existsSync } from 'fs';
import { WORKSPACE_ROOT } from './config.js';
import appRouter, { ECOSYSTEM_CONFIG, startApp } from './routes/app.js';
import execRouter from './routes/exec.js';
import filesRouter from './routes/files.js';
import gitRouter from './routes/git.js';

const app = express();
const AGENT_PORT = Number(process.env.AGENT_PORT) || 3001;

app.use(express.json({ limit: '50mb' }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/files', filesRouter);
app.use('/exec', execRouter);
app.use('/app', appRouter);
app.use('/git', gitRouter);

app.listen(AGENT_PORT, '::', () => {
  console.log(`Remote server listening on port ${AGENT_PORT}`);
  console.log(`  WORKSPACE_ROOT: ${WORKSPACE_ROOT}`);

  // The PM2 recipe only exists inside the docker image (Fly machine or
  // local docker-compose). Without it there is no custom app to manage —
  // a bare local `node dist/index.js` serves the file/exec/git API only.
  if (!existsSync(ECOSYSTEM_CONFIG)) {
    console.log(`No ${ECOSYSTEM_CONFIG} — no custom app to manage (local mode).`);
    return;
  }

  try {
    startApp();
  } catch (err) {
    console.error('Failed to start custom-app via PM2:', err);
    process.exit(1);
  }
});
