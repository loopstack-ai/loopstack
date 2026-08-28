import { Router } from 'express';
import { WORKSPACE_ROOT } from '../config.js';
import type { SessionSupervisor, StartSessionRequest } from './session.supervisor.js';

/** REST surface over the {@link SessionSupervisor}: start / status / incremental log / cancel. */
export function sessionsRouter(supervisor: SessionSupervisor): Router {
  const router = Router();

  router.post('/', async (req, res) => {
    const body = req.body as Partial<StartSessionRequest>;
    if (!body?.prompt) {
      res.status(400).json({ error: 'Missing required field: prompt' });
      return;
    }
    const id = await supervisor.start(body as StartSessionRequest, WORKSPACE_ROOT);
    res.json({ id });
  });

  router.get('/:id', async (req, res) => {
    const status = await supervisor.status(req.params.id);
    if (!status) {
      res.status(404).json({ error: 'No such session' });
      return;
    }
    res.json(status);
  });

  router.get('/:id/log', async (req, res) => {
    const offset = Number(req.query.offset) || 0;
    const result = await supervisor.readLog(req.params.id, offset);
    if (!result) {
      res.status(404).json({ error: 'No such session' });
      return;
    }
    res.json(result);
  });

  router.delete('/:id', async (req, res) => {
    const ok = await supervisor.kill(req.params.id);
    res.status(ok ? 200 : 404).json({ ok });
  });

  return router;
}
