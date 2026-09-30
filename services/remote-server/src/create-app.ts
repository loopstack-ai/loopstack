import express, { type Express } from 'express';
import { execStreamRouter } from './exec/exec-stream.router.js';
import { ExecSupervisor } from './exec/exec.supervisor.js';
import appRouter from './routes/app.js';
import execRouter from './routes/exec.js';
import filesRouter from './routes/files.js';
import gitRouter from './routes/git.js';

/** Build the HTTP API (files / exec / app / git). Starting the listener and the PM2-managed app is up to the caller. */
export function createApp(): Express {
  const app = express();
  app.use(express.json({ limit: '50mb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/files', filesRouter);
  // `/exec/stream/*` (streamed, offset-polled) is mounted before the blocking `POST /exec`.
  app.use('/exec/stream', execStreamRouter(new ExecSupervisor()));
  app.use('/exec', execRouter);
  app.use('/app', appRouter);
  app.use('/git', gitRouter);

  return app;
}
