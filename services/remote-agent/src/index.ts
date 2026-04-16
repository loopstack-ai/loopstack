import express from 'express';
import { WORKSPACE_ROOT } from './config';
import appRouter, { startApp } from './routes/app';
import execRouter from './routes/exec';
import filesRouter from './routes/files';
import gitRouter from './routes/git';

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
  console.log(`Remote agent listening on port ${AGENT_PORT}`);
  console.log(`  WORKSPACE_ROOT: ${WORKSPACE_ROOT}`);

  try {
    startApp();
  } catch (err) {
    console.error('Failed to start custom-app via PM2:', err);
    process.exit(1);
  }
});
