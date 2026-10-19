import { exec } from 'child_process';
import { Request, Response, Router } from 'express';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as tls from 'tls';
import { WORKSPACE_ROOT } from '../config.js';
import { isValidRef, quotePath, resolveRepoDir } from './git-paths.js';

const router = Router();
// What a git command is allowed to take. A command that only reads or writes refs, config or the index
// header is quick or it is stuck, so it gets the short budget. A command that walks the working tree, or
// talks to a remote, is routinely slow: a workspace is a bind mount from the host, and `status`, `add`,
// `commit`, `diff` and `checkout` over a monorepo through it take minutes rather than seconds, while a
// clone or a push takes as long as the repository and the network need. Every call names its budget, so a
// new route decides rather than inherits.
const METADATA_TIMEOUT_MS = 30_000;
const WORK_TIMEOUT_MS = 600_000;

// Every route takes an optional `dir`, relative to the workspace root, and runs git there. A workspace can
// hold several repositories in one tree, so an address is part of the request; omitting it means the root.
// The path is validated rather than trusted — see `resolveRepoDir`.

// Export Node's built-in CA bundle so git can use it for HTTPS.
// This works on any OS (macOS, Linux, Docker) without requiring ca-certificates.
const CA_BUNDLE_PATH = path.join(path.dirname(process.execPath), 'node-ca-bundle.pem');
fs.writeFileSync(CA_BUNDLE_PATH, tls.rootCertificates.join('\n'), 'utf-8');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function gitExec(
  args: string,
  timeout: number,
  token?: string,
  cwd?: string,
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
        cwd: cwd ?? WORKSPACE_ROOT,
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

/**
 * The directory a request addresses, or a 400 when it points outside the workspace. Returns `undefined` when
 * the response has already been sent.
 */
function requestedDir(dir: string | undefined, res: Response): string | undefined {
  try {
    return resolveRepoDir(dir);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// GET /status?dir=
// ---------------------------------------------------------------------------

router.get('/status', async (req: Request, res) => {
  try {
    const cwd = requestedDir(req.query.dir as string | undefined, res);
    if (cwd === undefined) return;
    const result = await gitExec('status --porcelain=v1 -b', WORK_TIMEOUT_MS, undefined, cwd);
    if (result.exitCode !== 0) {
      res.status(500).json({ error: result.stderr || result.stdout || 'git status failed' });
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
// GET /log?limit=20&dir=
// ---------------------------------------------------------------------------

router.get('/log', async (req: Request, res) => {
  try {
    const rawLimit = typeof req.query.limit === 'string' ? req.query.limit : '20';
    const limit = Math.min(Math.max(parseInt(rawLimit, 10) || 20, 1), 200);
    const SEP = '\x1f'; // ASCII Unit Separator — safe delimiter that won't appear in commit messages
    const cwd = requestedDir(req.query.dir as string | undefined, res);
    if (cwd === undefined) return;
    const result = await gitExec(
      `log --format="%H${SEP}%h${SEP}%s${SEP}%an${SEP}%aI" -n ${limit}`,
      METADATA_TIMEOUT_MS,
      undefined,
      cwd,
    );

    if (result.exitCode !== 0) {
      // Empty repo with no commits
      if (result.stderr.includes('does not have any commits')) {
        res.json({ commits: [] });
        return;
      }
      res.status(500).json({ error: result.stderr || result.stdout || 'git log failed' });
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
// GET /diff?staged=true&dir=
// ---------------------------------------------------------------------------

router.get('/diff', async (req: Request, res) => {
  try {
    const staged = req.query.staged === 'true';
    const args = staged ? 'diff --cached --name-status' : 'diff --name-status';
    const cwd = requestedDir(req.query.dir as string | undefined, res);
    if (cwd === undefined) return;
    const result = await gitExec(args, WORK_TIMEOUT_MS, undefined, cwd);

    if (result.exitCode !== 0) {
      res.status(500).json({ error: result.stderr || result.stdout || 'git diff failed' });
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
// GET /branches?dir=
// ---------------------------------------------------------------------------

router.get('/branches', async (req: Request, res) => {
  try {
    const cwd = requestedDir(req.query.dir as string | undefined, res);
    if (cwd === undefined) return;
    const result = await gitExec("branch --format='%(refname:short)||%(HEAD)'", METADATA_TIMEOUT_MS, undefined, cwd);
    if (result.exitCode !== 0) {
      res.status(500).json({ error: result.stderr || result.stdout || 'git branch failed' });
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
// GET /remote?dir=
// ---------------------------------------------------------------------------

router.get('/remote', async (req: Request, res) => {
  try {
    const cwd = requestedDir(req.query.dir as string | undefined, res);
    if (cwd === undefined) return;
    const result = await gitExec('remote -v', METADATA_TIMEOUT_MS, undefined, cwd);
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
// POST /add  { files: string[], dir? }
// ---------------------------------------------------------------------------

router.post('/add', async (req: Request, res) => {
  try {
    const { files, dir } = req.body as { files?: string[]; dir?: string };
    if (!files || !Array.isArray(files) || files.length === 0) {
      res.status(400).json({ error: 'Missing required field: files (string[])' });
      return;
    }

    const safeFiles = files.map((f) => `"${f.replace(/"/g, '\\"')}"`).join(' ');
    const cwd = requestedDir(dir, res);
    if (cwd === undefined) return;
    const result = await gitExec(`add ${safeFiles}`, WORK_TIMEOUT_MS, undefined, cwd);

    if (result.exitCode !== 0) {
      res.status(500).json({ error: result.stderr || result.stdout || 'git add failed' });
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
// POST /commit  { message: string, dir? }
// ---------------------------------------------------------------------------

router.post('/commit', async (req: Request, res) => {
  try {
    const { message, dir } = req.body as { message?: string; dir?: string };
    if (!message) {
      res.status(400).json({ error: 'Missing required field: message' });
      return;
    }

    const cwd = requestedDir(dir, res);
    if (cwd === undefined) return;

    // Write message to temp file to avoid shell escaping issues
    const tmpFile = path.join(os.tmpdir(), `git-commit-msg-${Date.now()}.txt`);
    fs.writeFileSync(tmpFile, message, 'utf-8');

    try {
      const result = await gitExec(`commit -F "${tmpFile}"`, WORK_TIMEOUT_MS, undefined, cwd);
      if (result.exitCode !== 0) {
        res.status(500).json({ error: result.stderr || result.stdout || 'git commit failed' });
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
// POST /push  { remote?, branch?, force?, token?, dir? }
// ---------------------------------------------------------------------------

router.post('/push', async (req: Request, res) => {
  try {
    const { remote, branch, force, token, dir } = req.body as {
      remote?: string;
      branch?: string;
      force?: boolean;
      token?: string;
      dir?: string;
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

    let cwd: string;
    try {
      cwd = resolveRepoDir(dir);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
      return;
    }
    const result = await gitExec(args, WORK_TIMEOUT_MS, token, cwd);
    if (result.exitCode !== 0) {
      res
        .status(500)
        .json({ error: result.stderr || result.stdout || 'git push failed', output: result.stdout + result.stderr });
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
// POST /fetch  { remote?, token?, dir? }
// ---------------------------------------------------------------------------

router.post('/fetch', async (req: Request, res) => {
  try {
    const { remote, token, dir } = req.body as { remote?: string; token?: string; dir?: string };

    let args = 'fetch';
    if (remote) {
      if (!isValidRef(remote)) {
        res.status(400).json({ error: 'Invalid remote name' });
        return;
      }
      args += ` ${remote}`;
    }

    let cwd: string;
    try {
      cwd = resolveRepoDir(dir);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
      return;
    }
    const result = await gitExec(args, WORK_TIMEOUT_MS, token, cwd);
    if (result.exitCode !== 0) {
      res
        .status(500)
        .json({ error: result.stderr || result.stdout || 'git fetch failed', output: result.stdout + result.stderr });
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
// POST /pull  { remote?, branch?, token?, dir? }
// ---------------------------------------------------------------------------

router.post('/pull', async (req: Request, res) => {
  try {
    const { remote, branch, token, dir } = req.body as {
      remote?: string;
      branch?: string;
      token?: string;
      dir?: string;
    };

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

    const cwd = requestedDir(dir, res);
    if (cwd === undefined) return;
    const result = await gitExec(args, WORK_TIMEOUT_MS, token, cwd);
    if (result.exitCode !== 0) {
      res
        .status(500)
        .json({ error: result.stderr || result.stdout || 'git pull failed', output: result.stdout + result.stderr });
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
// POST /checkout  { branch, create?, dir? }
// ---------------------------------------------------------------------------

router.post('/checkout', async (req: Request, res) => {
  try {
    const { branch, create, dir } = req.body as { branch?: string; create?: boolean; dir?: string };
    if (!branch) {
      res.status(400).json({ error: 'Missing required field: branch' });
      return;
    }
    if (!isValidRef(branch)) {
      res.status(400).json({ error: 'Invalid branch name' });
      return;
    }

    const flag = create ? '-b ' : '';
    const cwd = requestedDir(dir, res);
    if (cwd === undefined) return;
    const result = await gitExec(`checkout ${flag}${branch}`, WORK_TIMEOUT_MS, undefined, cwd);

    if (result.exitCode !== 0) {
      res.status(500).json({ error: result.stderr || result.stdout || 'git checkout failed' });
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
// POST /clone  { url, branch?, token?, dir? }
// ---------------------------------------------------------------------------

router.post('/clone', async (req: Request, res) => {
  try {
    const { url, branch, token, dir } = req.body as {
      url?: string;
      branch?: string;
      token?: string;
      dir?: string;
    };
    if (!url) {
      res.status(400).json({ error: 'Missing required field: url' });
      return;
    }
    if (branch && !isValidRef(branch)) {
      res.status(400).json({ error: 'Invalid branch name' });
      return;
    }

    // Clone into `dir` (default: the workspace root), which must be empty. The target is created first so
    // a nested path works, and the clone still runs from the root with an explicit target — keeping the
    // validated path in one place. A token, if given, is supplied via GIT_ASKPASS — never embedded in the
    // URL, so it can't leak into process listings or logs.
    let target: string;
    try {
      target = resolveRepoDir(dir);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
      return;
    }
    fs.mkdirSync(target, { recursive: true });
    const branchArg = branch ? ` --branch ${branch}` : '';
    const result = await gitExec(`clone${branchArg} ${quotePath(url)} ${quotePath(target)}`, WORK_TIMEOUT_MS, token);

    if (result.exitCode !== 0) {
      res.status(500).json({
        error: result.stderr || result.stdout || 'git clone failed',
        output: result.stdout + result.stderr,
      });
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
// POST /branch  { name, dir? }
// ---------------------------------------------------------------------------

router.post('/branch', async (req: Request, res) => {
  try {
    const { name, dir } = req.body as { name?: string; dir?: string };
    if (!name) {
      res.status(400).json({ error: 'Missing required field: name' });
      return;
    }
    if (!isValidRef(name)) {
      res.status(400).json({ error: 'Invalid branch name' });
      return;
    }

    const cwd = requestedDir(dir, res);
    if (cwd === undefined) return;
    const result = await gitExec(`branch ${name}`, METADATA_TIMEOUT_MS, undefined, cwd);
    if (result.exitCode !== 0) {
      res.status(500).json({ error: result.stderr || result.stdout || 'git branch failed' });
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
// POST /remote/configure  { url, dir? }
// ---------------------------------------------------------------------------

router.post('/remote/configure', async (req: Request, res) => {
  try {
    const { url, dir } = req.body as { url?: string; dir?: string };
    if (!url) {
      res.status(400).json({ error: 'Missing required field: url' });
      return;
    }

    // Check if origin remote already exists
    const cwd = requestedDir(dir, res);
    if (cwd === undefined) return;
    const check = await gitExec('remote', METADATA_TIMEOUT_MS, undefined, cwd);
    const remotes = check.stdout.split('\n').filter(Boolean);

    let result;
    if (remotes.includes('origin')) {
      result = await gitExec(`remote set-url origin "${url}"`, METADATA_TIMEOUT_MS, undefined, cwd);
    } else {
      result = await gitExec(`remote add origin "${url}"`, METADATA_TIMEOUT_MS, undefined, cwd);
    }

    if (result.exitCode !== 0) {
      res.status(500).json({ error: result.stderr || result.stdout || 'Failed to configure remote' });
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
// DELETE /remote  { name?, dir? }
// ---------------------------------------------------------------------------

router.delete('/remote', async (req: Request, res) => {
  try {
    const { name, dir } = req.body as { name?: string; dir?: string };
    const remoteName = name || 'origin';

    if (!isValidRef(remoteName)) {
      res.status(400).json({ error: 'Invalid remote name' });
      return;
    }

    const cwd = requestedDir(dir, res);
    if (cwd === undefined) return;
    const result = await gitExec(`remote remove ${remoteName}`, METADATA_TIMEOUT_MS, undefined, cwd);
    if (result.exitCode !== 0) {
      res.status(500).json({ error: result.stderr || result.stdout || 'Failed to remove remote' });
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
// POST /config-user  { name, email, dir? }
// ---------------------------------------------------------------------------

router.post('/config-user', async (req: Request, res) => {
  try {
    const { name, email, dir } = req.body as { name?: string; email?: string; dir?: string };
    if (!name || !email) {
      res.status(400).json({ error: 'Missing required fields: name, email' });
      return;
    }

    const cwd = requestedDir(dir, res);
    if (cwd === undefined) return;
    const nameResult = await gitExec(
      `config user.name "${name.replace(/"/g, '\\"')}"`,
      METADATA_TIMEOUT_MS,
      undefined,
      cwd,
    );
    if (nameResult.exitCode !== 0) {
      res.status(500).json({ error: nameResult.stderr || 'Failed to set user.name' });
      return;
    }

    const emailResult = await gitExec(
      `config user.email "${email.replace(/"/g, '\\"')}"`,
      METADATA_TIMEOUT_MS,
      undefined,
      cwd,
    );
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

// ---------------------------------------------------------------------------
// GET /worktree/list?dir=
// ---------------------------------------------------------------------------

router.get('/worktree/list', async (req: Request, res) => {
  try {
    const cwd = requestedDir(req.query.dir as string | undefined, res);
    if (cwd === undefined) return;
    const result = await gitExec('worktree list --porcelain', METADATA_TIMEOUT_MS, undefined, cwd);
    if (result.exitCode !== 0) {
      res.status(500).json({ error: result.stderr || result.stdout || 'git worktree list failed' });
      return;
    }

    type Worktree = {
      path: string;
      head?: string;
      branch?: string;
      bare: boolean;
      detached: boolean;
      locked?: string;
      prunable?: string;
    };

    const worktrees: Worktree[] = [];
    let current: Partial<Worktree> | null = null;

    for (const line of result.stdout.split('\n')) {
      if (line === '') {
        if (current && current.path) {
          worktrees.push({
            path: current.path,
            head: current.head,
            branch: current.branch,
            bare: current.bare ?? false,
            detached: current.detached ?? false,
            locked: current.locked,
            prunable: current.prunable,
          });
        }
        current = null;
        continue;
      }

      if (!current) current = { bare: false, detached: false };

      if (line.startsWith('worktree ')) {
        current.path = line.substring('worktree '.length);
      } else if (line.startsWith('HEAD ')) {
        current.head = line.substring('HEAD '.length);
      } else if (line.startsWith('branch ')) {
        current.branch = line.substring('branch '.length);
      } else if (line === 'bare') {
        current.bare = true;
      } else if (line === 'detached') {
        current.detached = true;
      } else if (line.startsWith('locked')) {
        current.locked = line.length > 'locked'.length ? line.substring('locked '.length) : '';
      } else if (line.startsWith('prunable')) {
        current.prunable = line.length > 'prunable'.length ? line.substring('prunable '.length) : '';
      }
    }

    if (current && current.path) {
      worktrees.push({
        path: current.path,
        head: current.head,
        branch: current.branch,
        bare: current.bare ?? false,
        detached: current.detached ?? false,
        locked: current.locked,
        prunable: current.prunable,
      });
    }

    res.json({ worktrees });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[git] uncaught error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /worktree/add  { path, branch?, newBranch?, force?, dir? }
// ---------------------------------------------------------------------------

router.post('/worktree/add', async (req: Request, res) => {
  try {
    const {
      path: wtPath,
      branch,
      newBranch,
      force,
      dir,
    } = req.body as {
      path?: string;
      dir?: string;
      branch?: string;
      newBranch?: boolean;
      force?: boolean;
    };

    if (!wtPath) {
      res.status(400).json({ error: 'Missing required field: path' });
      return;
    }
    if (branch && !isValidRef(branch)) {
      res.status(400).json({ error: 'Invalid branch name' });
      return;
    }

    let args = 'worktree add';
    if (force) args += ' --force';
    if (newBranch && branch) {
      args += ` -b ${branch} ${quotePath(wtPath)}`;
    } else {
      args += ` ${quotePath(wtPath)}`;
      if (branch) args += ` ${branch}`;
    }

    const cwd = requestedDir(dir, res);
    if (cwd === undefined) return;
    const result = await gitExec(args, WORK_TIMEOUT_MS, undefined, cwd);
    if (result.exitCode !== 0) {
      res.status(500).json({
        error: result.stderr || result.stdout || 'git worktree add failed',
        output: result.stdout + result.stderr,
      });
      return;
    }

    res.json({ success: true, path: wtPath, output: result.stdout + result.stderr });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[git] uncaught error: ${message}`);
    res.status(500).json({ error: message });
  }
});

// ---------------------------------------------------------------------------
// POST /worktree/remove  { path, force?, dir? }
// ---------------------------------------------------------------------------

router.post('/worktree/remove', async (req: Request, res) => {
  try {
    const { path: wtPath, force, dir } = req.body as { path?: string; force?: boolean; dir?: string };
    if (!wtPath) {
      res.status(400).json({ error: 'Missing required field: path' });
      return;
    }

    let args = 'worktree remove';
    if (force) args += ' --force';
    args += ` ${quotePath(wtPath)}`;

    const cwd = requestedDir(dir, res);
    if (cwd === undefined) return;
    const result = await gitExec(args, WORK_TIMEOUT_MS, undefined, cwd);
    if (result.exitCode !== 0) {
      res.status(500).json({ error: result.stderr || result.stdout || 'git worktree remove failed' });
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
// POST /worktree/prune  { dir? }
// ---------------------------------------------------------------------------

router.post('/worktree/prune', async (req: Request, res) => {
  try {
    const { dir } = req.body as { dir?: string };
    const cwd = requestedDir(dir, res);
    if (cwd === undefined) return;
    const result = await gitExec('worktree prune -v', METADATA_TIMEOUT_MS, undefined, cwd);
    if (result.exitCode !== 0) {
      res.status(500).json({ error: result.stderr || result.stdout || 'git worktree prune failed' });
      return;
    }

    res.json({ success: true, output: result.stdout + result.stderr });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[git] uncaught error: ${message}`);
    res.status(500).json({ error: message });
  }
});

export default router;
