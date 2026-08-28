import { type ChildProcess, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createWriteStream, existsSync, promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { DEFAULT_EFFORT, DEFAULT_MAX_BUDGET_USD } from '../config.js';

export type SessionStatus = 'running' | 'exited' | 'killed';

export interface StartSessionRequest {
  prompt: string;
  cwd?: string;
  model?: string;
  effort?: string;
  maxBudgetUsd?: number;
  resumeSessionId?: string;
  /** Restrict the run to these tools; when omitted the run uses bypassPermissions (full access). */
  allowedTools?: string[];
}

export interface SessionStatusResponse {
  id: string;
  status: SessionStatus;
  exitCode: number | null;
  killedBySignal: string | null;
  bytesWritten: number;
  startedAt: string;
  endedAt: string | null;
}

interface SessionRecord {
  id: string;
  status: SessionStatus;
  exitCode: number | null;
  killedBySignal: string | null;
  logPath: string;
  errPath: string;
  startedAt: string;
  endedAt: string | null;
}

const SESSIONS_DIR = path.join(os.tmpdir(), 'claude-sessions');
const KILL_GRACE_MS = 5000;

// The interactive image bakes in an `ask_user` MCP tool + this config file. When it's present we launch
// claude with the tool available and instruct it to ask-then-stop; the base image lacks the file and
// runs non-interactively. So the image alone selects the mode — the server needs no extra flag.
const ASK_USER_MCP_CONFIG = '/etc/loopstack/ask-user.mcp.json';
const ASK_USER_MCP_AVAILABLE = existsSync(ASK_USER_MCP_CONFIG);
// Forceful on purpose: MCP tools are deferred behind tool-search in this Claude version, so unless the
// prompt names `ask_user` and makes plain-text questions a dead end, the agent just asks in text and
// never discovers the tool. This wording reliably drives tool-search → ask_user → end turn.
const ASK_USER_SYSTEM_PROMPT =
  'You are running in a HEADLESS session with no interactive terminal. If you write a question as plain ' +
  'text it is NOT delivered to the user and your turn ends with no answer. The ONLY way to get any ' +
  'information, decision, or clarification from the user is the ask_user tool (a tool named ask_user is ' +
  'available; use tool search to locate it if it is not already visible). Whenever you need input from ' +
  'the user you MUST call ask_user with one clear question and then stop. Never ask the user anything in ' +
  'a normal assistant message.';

/**
 * Owns the lifecycle of every headless Claude Code process on this host. Because the supervisor holds
 * the actual {@link ChildProcess} handle, exit codes are authoritative and liveness is intrinsic — an
 * OOM/crash fires `exit` immediately, so a dead job is known at once rather than inferred from a missing
 * sentinel file. stdout (the `stream-json` transcript) is streamed to an append-only log so a long run
 * never has to be held in memory, and the host reads it incrementally by byte offset.
 */
export class SessionSupervisor {
  private readonly sessions = new Map<string, { record: SessionRecord; child: ChildProcess }>();

  async start(req: StartSessionRequest, workspaceRoot: string): Promise<string> {
    await fs.mkdir(SESSIONS_DIR, { recursive: true });

    const id = randomUUID();
    const logPath = path.join(SESSIONS_DIR, `${id}.ndjson`);
    const errPath = path.join(SESSIONS_DIR, `${id}.err`);
    const cwd = req.cwd ? path.resolve(workspaceRoot, req.cwd) : workspaceRoot;

    const env: NodeJS.ProcessEnv = { ...process.env, IS_SANDBOX: '1' };
    // Subscription auth only — never the metered API. If a token is present, make sure a stray
    // ANTHROPIC_API_KEY can't take precedence.
    if (env.CLAUDE_CODE_OAUTH_TOKEN) delete env.ANTHROPIC_API_KEY;

    const out = createWriteStream(logPath);
    const errOut = createWriteStream(errPath);

    const child = spawn('claude', this.buildArgs(req), { cwd, env });
    child.stdout.pipe(out);
    child.stderr.pipe(errOut);
    child.stdin.write(req.prompt);
    child.stdin.end();

    const record: SessionRecord = {
      id,
      status: 'running',
      exitCode: null,
      killedBySignal: null,
      logPath,
      errPath,
      startedAt: new Date().toISOString(),
      endedAt: null,
    };

    child.on('exit', (code, signal) => {
      record.status = signal ? 'killed' : 'exited';
      record.exitCode = code;
      record.killedBySignal = signal;
      record.endedAt = new Date().toISOString();
    });
    child.on('error', (err) => {
      // spawn failure (e.g. claude not on PATH): surface as a failed session, not a hung one.
      record.status = 'exited';
      record.exitCode = record.exitCode ?? 1;
      record.endedAt = record.endedAt ?? new Date().toISOString();
      errOut.write(`\n[supervisor] spawn error: ${err.message}\n`);
    });

    this.sessions.set(id, { record, child });
    return id;
  }

  async status(id: string): Promise<SessionStatusResponse | null> {
    const entry = this.sessions.get(id);
    if (!entry) return null;
    const { record } = entry;
    return {
      id: record.id,
      status: record.status,
      exitCode: record.exitCode,
      killedBySignal: record.killedBySignal,
      bytesWritten: await this.fileSize(record.logPath),
      startedAt: record.startedAt,
      endedAt: record.endedAt,
    };
  }

  /** Incremental read of the transcript log from `offset` to EOF. */
  async readLog(id: string, offset: number): Promise<{ chunk: string; nextOffset: number } | null> {
    const entry = this.sessions.get(id);
    if (!entry) return null;

    const size = await this.fileSize(entry.record.logPath);
    if (offset >= size) return { chunk: '', nextOffset: size };

    const handle = await fs.open(entry.record.logPath, 'r');
    try {
      const length = size - offset;
      const buffer = Buffer.alloc(length);
      await handle.read(buffer, 0, length, offset);
      return { chunk: buffer.toString('utf8'), nextOffset: size };
    } finally {
      await handle.close();
    }
  }

  /** Terminate a running session (SIGTERM, then SIGKILL after a grace period). */
  async kill(id: string): Promise<boolean> {
    const entry = this.sessions.get(id);
    if (!entry) return false;
    entry.child.kill('SIGTERM');
    setTimeout(() => {
      if (entry.record.status === 'running') entry.child.kill('SIGKILL');
    }, KILL_GRACE_MS);
    return true;
  }

  /**
   * Read a persisted Claude session transcript (`<config>/projects/<project>/<sessionId>.jsonl`) for
   * resume-context display. Keyed by Claude's own session id (not the supervisor id); returns null when
   * the file is absent. Only meaningful in thread mode, where CLAUDE_CONFIG_DIR is a mounted dir.
   */
  async readTranscript(sessionId: string): Promise<string | null> {
    if (!/^[\w.-]+$/.test(sessionId)) return null; // guard against path traversal
    const configDir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
    const projectsDir = path.join(configDir, 'projects');
    // The project dir name is derived from cwd (e.g. `/workspace` → `-workspace`) and varies by version,
    // so search every project dir for `<sessionId>.jsonl` — the id is unique, so at most one matches.
    let projects: string[];
    try {
      projects = await fs.readdir(projectsDir);
    } catch {
      return null;
    }
    for (const project of projects) {
      try {
        return await fs.readFile(path.join(projectsDir, project, `${sessionId}.jsonl`), 'utf8');
      } catch {
        /* not in this project dir */
      }
    }
    return null;
  }

  private buildArgs(req: StartSessionRequest): string[] {
    const args = ['-p', '--output-format', 'stream-json', '--verbose'];
    if (req.resumeSessionId) args.push('--resume', req.resumeSessionId);

    const budget = req.maxBudgetUsd ?? DEFAULT_MAX_BUDGET_USD;
    if (budget) args.push('--max-budget-usd', String(budget));
    if (req.model) args.push('--model', req.model);

    const effort = req.effort ?? DEFAULT_EFFORT;
    if (effort) args.push('--effort', effort);

    if (req.allowedTools?.length) args.push('--allowedTools', req.allowedTools.join(','));
    else args.push('--permission-mode', 'bypassPermissions');

    if (ASK_USER_MCP_AVAILABLE) {
      args.push(
        '--mcp-config',
        ASK_USER_MCP_CONFIG,
        '--strict-mcp-config',
        '--append-system-prompt',
        ASK_USER_SYSTEM_PROMPT,
      );
    }

    return args;
  }

  private async fileSize(filePath: string): Promise<number> {
    try {
      return (await fs.stat(filePath)).size;
    } catch {
      return 0;
    }
  }
}
