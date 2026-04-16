import { exec } from 'child_process';
import { Request, Router } from 'express';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as tls from 'tls';
import { WORKSPACE_ROOT } from '../config';

const router = Router();
const GIT_TIMEOUT_MS = 30_000;

// Export Node's built-in CA bundle so git can use it for HTTPS.
// This works on any OS (macOS, Linux, Docker) without requiring ca-certificates.
const CA_BUNDLE_PATH = path.join(path.dirname(process.execPath), 'node-ca-bundle.pem');
fs.writeFileSync(CA_BUNDLE_PATH, tls.rootCertificates.join('\n'), 'utf-8');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function gitExec(
  args: string,
  timeout = GIT_TIMEOUT_MS,
  token?: string,
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  // If a token is provided, create a temporary GIT_ASKPASS script that returns it.
  // The token only exists on disk for the duration of the command.
  let askPassScript: string | undefined;
  if (token) {
    askPassScript = path.join(os.tmpdir(), `git-askpass-${Date.now()}-${Math.random().toString(36).slice(2)}.sh`);
    fs.writeFileSync(askPassScript, `#!/bin/sh\necho "${token}"`, { mode: 0o700 });
  }

  const env: Record<string, string | undefined> = {
    ...process.env,
    GIT_SSL_CAINFO: process.env.GIT_SSL_CAINFO || CA_BUNDLE_PATH,
  };

  if (askPassScript) {
    env.GIT_ASKPASS = askPassScript;
    env.GIT_TERMINAL_PROMPT = '0';
  }

  return new Promise((resolve) => {
    exec(
      `git ${args}`,
      {
        cwd: WORKSPACE_ROOT,
        timeout,
        maxBuffer: 10 * 1024 * 1024,
        env,
      },
      (error, stdout, stderr) => {
        // Clean up the askpass script immediately after the command finishes
        if (askPassScript) {
          try {
            fs.unlinkSync(askPassScript);
          } catch {
            // ignore
          }
        }

        if (error) {
          console.log(
            `[git] error: code=${error.code} killed=${error.killed} signal=${error.signal} message=${error.message?.substring(0, 200)}`,
          );
        }
        const exitCode = error ? (typeof error.code === 'number' ? error.code : 1) : 0;
        resolve({ stdout: stdout || '', stderr: stderr || '', exitCode });
      },
    );
  });
}

function isValidRef(name: string): boolean {
  return /^[a-zA-Z0-9._\-/]+$/.test(name) && !name.includes('..');
}

// ---------------------------------------------------------------------------
// GET /status
// ---------------------------------------------------------------------------

router.get('/status', async (_req: Request, res) => {
  try {
    const result = await gitExec('status --porcelain=v1 -b');
    if (result.exitCode !== 0) {
      res.status(500).json({ error: result.stderr || 'git status failed' });
      return;
    }

    const lines = result.stdout.split('\n').filter(Boolean);
    let branch = 'unknown';
    const staged: string[] = [];
    const modified: string[] = [];
    const untracked: string[] = [];
    const deleted: string[] = [];

    for (const line of lines) {
      if (line.startsWith('## ')) {
        // ## branch...tracking or ## branch
        branch = line.substring(3).split('...')[0].trim();
        continue;
      }

      const indexStatus = line[0];
      const workTreeStatus = line[1];
      const filePath = line.substring(3).trim();

      if (indexStatus === '?' && workTreeStatus === '?') {
        untracked.push(filePath);
      } else {
        if (indexStatus && indexStatus !== ' ' && indexStatus !== '?') {
          if (indexStatus === 'D') {
            deleted.push(filePath);
          } else {
            staged.push(filePath);
          }
        }
        if (workTreeStatus && workTreeStatus !== ' ' && workTreeStatus !== '?') {
          if (workTreeStatus === 'D') {
            deleted.push(filePath);
          } else {
            modified.push(filePath);
          }
        }
      }
    }

    res.json({ branch, staged, modified, untracked, deleted });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[git] uncaught error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// GET /log?limit=20
// ---------------------------------------------------------------------------

router.get('/log', async (req: Request, res) => {
  try {
    const rawLimit = typeof req.query.limit === 'string' ? req.query.limit : '20';
    const limit = Math.min(Math.max(parseInt(rawLimit, 10) || 20, 1), 200);
    const SEP = '\x1f'; // ASCII Unit Separator — safe delimiter that won't appear in commit messages
    const result = await gitExec(`log --format="%H${SEP}%h${SEP}%s${SEP}%an${SEP}%aI" -n ${limit}`);

    if (result.exitCode !== 0) {
      // Empty repo with no commits
      if (result.stderr.includes('does not have any commits')) {
        res.json({ commits: [] });
        return;
      }
      res.status(500).json({ error: result.stderr || 'git log failed' });
      return;
    }

    const commits = result.stdout
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [hash, shortHash, message, author, date] = line.split(SEP);
        return { hash, shortHash, message, author, date };
      });

    res.json({ commits });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[git] uncaught error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// GET /diff?staged=true
// ---------------------------------------------------------------------------

router.get('/diff', async (req: Request, res) => {
  try {
    const staged = req.query.staged === 'true';
    const args = staged ? 'diff --cached --name-status' : 'diff --name-status';
    const result = await gitExec(args);

    if (result.exitCode !== 0) {
      res.status(500).json({ error: result.stderr || 'git diff failed' });
      return;
    }

    const files = result.stdout
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [status, ...rest] = line.split('\t');
        return { status: status.trim(), path: rest.join('\t').trim() };
      });

    res.json({ files });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[git] uncaught error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// GET /branches
// ---------------------------------------------------------------------------

router.get('/branches', async (_req: Request, res) => {
  try {
    const result = await gitExec("branch --format='%(refname:short)||%(HEAD)'");
    if (result.exitCode !== 0) {
      res.status(500).json({ error: result.stderr || 'git branch failed' });
      return;
    }

    let current = '';
    const branches = result.stdout
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const cleaned = line.replace(/'/g, '');
        const [name, head] = cleaned.split('||');
        const isCurrent = head?.trim() === '*';
        if (isCurrent) current = name.trim();
        return { name: name.trim(), isCurrent };
      });

    res.json({ current, branches });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[git] uncaught error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// GET /remote
// ---------------------------------------------------------------------------

router.get('/remote', async (_req: Request, res) => {
  try {
    const result = await gitExec('remote -v');
    if (result.exitCode !== 0 || !result.stdout.trim()) {
      res.json(null);
      return;
    }

    // Parse first fetch line: origin\thttps://... (fetch)
    const firstLine = result.stdout.split('\n').find((l) => l.includes('(fetch)'));
    if (!firstLine) {
      res.json(null);
      return;
    }

    const parts = firstLine.split(/\s+/);
    const name = parts[0];
    // Strip embedded credentials from URL for display
    let url = parts[1] || '';
    url = url.replace(/\/\/[^@]+@/, '//');

    res.json({ name, url });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[git] uncaught error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /add  { files: string[] }
// ---------------------------------------------------------------------------

router.post('/add', async (req: Request, res) => {
  try {
    const { files } = req.body as { files?: string[] };
    if (!files || !Array.isArray(files) || files.length === 0) {
      res.status(400).json({ error: 'Missing required field: files (string[])' });
      return;
    }

    const safeFiles = files.map((f) => `"${f.replace(/"/g, '\\"')}"`).join(' ');
    const result = await gitExec(`add ${safeFiles}`);

    if (result.exitCode !== 0) {
      res.status(500).json({ error: result.stderr || 'git add failed' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[git] uncaught error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /commit  { message: string }
// ---------------------------------------------------------------------------

router.post('/commit', async (req: Request, res) => {
  try {
    const { message } = req.body as { message?: string };
    if (!message) {
      res.status(400).json({ error: 'Missing required field: message' });
      return;
    }

    // Write message to temp file to avoid shell escaping issues
    const tmpFile = path.join(os.tmpdir(), `git-commit-msg-${Date.now()}.txt`);
    fs.writeFileSync(tmpFile, message, 'utf-8');

    try {
      const result = await gitExec(`commit -F "${tmpFile}"`);
      if (result.exitCode !== 0) {
        res.status(500).json({ error: result.stderr || 'git commit failed' });
        return;
      }

      // Parse commit hash from output like "[main abc1234] message"
      const match = result.stdout.match(/\[[\w\-/.]+ ([a-f0-9]+)\]/);
      const hash = match ? match[1] : '';

      res.json({ hash, message });
    } finally {
      try {
        fs.unlinkSync(tmpFile);
      } catch {
        // ignore cleanup failure
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[git] uncaught error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /push  { remote?, branch?, force? }
// ---------------------------------------------------------------------------

router.post('/push', async (req: Request, res) => {
  try {
    const { remote, branch, force, token } = req.body as {
      remote?: string;
      branch?: string;
      force?: boolean;
      token?: string;
    };

    let args = 'push';
    if (force) args += ' --force';
    if (remote) {
      if (!isValidRef(remote)) {
        res.status(400).json({ error: 'Invalid remote name' });
        return;
      }
      args += ` ${remote}`;
    }
    if (branch) {
      if (!isValidRef(branch)) {
        res.status(400).json({ error: 'Invalid branch name' });
        return;
      }
      args += ` ${branch}`;
    }

    const result = await gitExec(args, 60_000, token);
    if (result.exitCode !== 0) {
      res.status(500).json({ error: result.stderr || 'git push failed', output: result.stdout + result.stderr });
      return;
    }

    res.json({ success: true, output: result.stdout + result.stderr });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[git] uncaught error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /fetch  { remote? }
// ---------------------------------------------------------------------------

router.post('/fetch', async (req: Request, res) => {
  try {
    const { remote, token } = req.body as { remote?: string; token?: string };

    let args = 'fetch';
    if (remote) {
      if (!isValidRef(remote)) {
        res.status(400).json({ error: 'Invalid remote name' });
        return;
      }
      args += ` ${remote}`;
    }

    const result = await gitExec(args, 60_000, token);
    if (result.exitCode !== 0) {
      res.status(500).json({ error: result.stderr || 'git fetch failed', output: result.stdout + result.stderr });
      return;
    }

    res.json({ success: true, output: result.stdout + result.stderr });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[git] uncaught error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /pull  { remote?, branch? }
// ---------------------------------------------------------------------------

router.post('/pull', async (req: Request, res) => {
  try {
    const { remote, branch, token } = req.body as { remote?: string; branch?: string; token?: string };

    let args = 'pull';
    if (remote) {
      if (!isValidRef(remote)) {
        res.status(400).json({ error: 'Invalid remote name' });
        return;
      }
      args += ` ${remote}`;
    }
    if (branch) {
      if (!isValidRef(branch)) {
        res.status(400).json({ error: 'Invalid branch name' });
        return;
      }
      args += ` ${branch}`;
    }

    const result = await gitExec(args, 60_000, token);
    if (result.exitCode !== 0) {
      res.status(500).json({ error: result.stderr || 'git pull failed', output: result.stdout + result.stderr });
      return;
    }

    res.json({ success: true, output: result.stdout + result.stderr });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[git] uncaught error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /checkout  { branch, create? }
// ---------------------------------------------------------------------------

router.post('/checkout', async (req: Request, res) => {
  try {
    const { branch, create } = req.body as { branch?: string; create?: boolean };
    if (!branch) {
      res.status(400).json({ error: 'Missing required field: branch' });
      return;
    }
    if (!isValidRef(branch)) {
      res.status(400).json({ error: 'Invalid branch name' });
      return;
    }

    const flag = create ? '-b ' : '';
    const result = await gitExec(`checkout ${flag}${branch}`);

    if (result.exitCode !== 0) {
      res.status(500).json({ error: result.stderr || 'git checkout failed' });
      return;
    }

    res.json({ branch });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[git] uncaught error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /branch  { name }
// ---------------------------------------------------------------------------

router.post('/branch', async (req: Request, res) => {
  try {
    const { name } = req.body as { name?: string };
    if (!name) {
      res.status(400).json({ error: 'Missing required field: name' });
      return;
    }
    if (!isValidRef(name)) {
      res.status(400).json({ error: 'Invalid branch name' });
      return;
    }

    const result = await gitExec(`branch ${name}`);
    if (result.exitCode !== 0) {
      res.status(500).json({ error: result.stderr || 'git branch failed' });
      return;
    }

    res.json({ branch: name });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[git] uncaught error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /remote/configure  { url }
// ---------------------------------------------------------------------------

router.post('/remote/configure', async (req: Request, res) => {
  try {
    const { url } = req.body as { url?: string };
    if (!url) {
      res.status(400).json({ error: 'Missing required field: url' });
      return;
    }

    // Check if origin remote already exists
    const check = await gitExec('remote');
    const remotes = check.stdout.split('\n').filter(Boolean);

    let result;
    if (remotes.includes('origin')) {
      result = await gitExec(`remote set-url origin "${url}"`);
    } else {
      result = await gitExec(`remote add origin "${url}"`);
    }

    if (result.exitCode !== 0) {
      res.status(500).json({ error: result.stderr || 'Failed to configure remote' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[git] uncaught error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// DELETE /remote  { name? }
// ---------------------------------------------------------------------------

router.delete('/remote', async (req: Request, res) => {
  try {
    const { name } = req.body as { name?: string };
    const remoteName = name || 'origin';

    if (!isValidRef(remoteName)) {
      res.status(400).json({ error: 'Invalid remote name' });
      return;
    }

    const result = await gitExec(`remote remove ${remoteName}`);
    if (result.exitCode !== 0) {
      res.status(500).json({ error: result.stderr || 'Failed to remove remote' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[git] uncaught error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /config-user  { name, email }
// ---------------------------------------------------------------------------

router.post('/config-user', async (req: Request, res) => {
  try {
    const { name, email } = req.body as { name?: string; email?: string };
    if (!name || !email) {
      res.status(400).json({ error: 'Missing required fields: name, email' });
      return;
    }

    const nameResult = await gitExec(`config user.name "${name.replace(/"/g, '\\"')}"`);
    if (nameResult.exitCode !== 0) {
      res.status(500).json({ error: nameResult.stderr || 'Failed to set user.name' });
      return;
    }

    const emailResult = await gitExec(`config user.email "${email.replace(/"/g, '\\"')}"`);
    if (emailResult.exitCode !== 0) {
      res.status(500).json({ error: emailResult.stderr || 'Failed to set user.email' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[git] uncaught error: ${message}`);
    res.status(500).json({ error: message });
  }
});

export default router;
