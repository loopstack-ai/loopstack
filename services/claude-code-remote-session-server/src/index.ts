import express from 'express';
import { AGENT_PORT, WORKSPACE_ROOT } from './config.js';
import execRouter from './routes/exec.js';
import filesRouter from './routes/files.js';
import gitRouter from './routes/git.js';
import { SessionSupervisor } from './session/session.supervisor.js';
import { sessionsRouter } from './session/sessions.router.js';

const app = express();
app.use(express.json({ limit: '50mb' }));

const supervisor = new SessionSupervisor();

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/sessions', sessionsRouter(supervisor));

// Workspace operations (exec / git / files) — used by the Engineer to initialize the workspace and by
// remote-client-based features (file explorer, git panels) to inspect the running container.
app.use('/exec', execRouter);
app.use('/git', gitRouter);
app.use('/files', filesRouter);

// Persisted Claude session transcript (by Claude's session id) — for resume-context display.
app.get('/transcript/:sessionId', async (req, res) => {
  const content = await supervisor.readTranscript(req.params.sessionId);
  if (content === null) {
    res.status(404).json({ error: 'No transcript for this session' });
    return;
  }
  res.json({ content });
});

app.listen(AGENT_PORT, '::', () => {
  console.log(`claude-code-remote-session-server listening on port ${AGENT_PORT}`);
  console.log(`  WORKSPACE_ROOT: ${WORKSPACE_ROOT}`);
});
