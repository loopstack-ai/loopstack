import { type ChildProcess, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createWriteStream, promises as fs } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

export type ExecStatus = 'running' | 'exited' | 'killed';

export interface StartExecRequest {
  command: string;
  cwd?: string;
  /** Hard ceiling in ms; the process is SIGKILLed when it elapses (0 / omitted = no limit). */
  timeout?: number;
}

export interface ExecStatusResponse {
  id: string;
  status: ExecStatus;
  exitCode: number | null;
  killedBySignal: string | null;
  timedOut: boolean;
  bytesWritten: number;
  startedAt: string;
  endedAt: string | null;
}

interface ExecRecord {
  id: string;
  status: ExecStatus;
  exitCode: number | null;
  killedBySignal: string | null;
  timedOut: boolean;
  logPath: string;
  startedAt: string;
  endedAt: string | null;
}

const EXEC_DIR = path.join(os.tmpdir(), 'claude-exec');
const KILL_GRACE_MS = 5000;

/**
 * Owns the lifecycle of every streamed shell command on this host — the exec counterpart of the
 * {@link SessionSupervisor}. Because it holds the {@link ChildProcess} handle, exit codes are
 * authoritative and a crash/OOM fires `exit` at once. stdout and stderr are merged into one
 * append-only log (chronological terminal view) so a long build never has to be held in memory, and
 * the host reads it incrementally by byte offset — the same contract the session runner uses.
 */
export class ExecSupervisor {
  private readonly commands = new Map<string, { record: ExecRecord; child: ChildProcess; timer?: NodeJS.Timeout }>();

  async start(req: StartExecRequest, workspaceRoot: string): Promise<string> {
    await fs.mkdir(EXEC_DIR, { recursive: true });

    const id = randomUUID();
    const logPath = path.join(EXEC_DIR, `${id}.log`);
    const cwd = req.cwd ? path.resolve(workspaceRoot, req.cwd) : workspaceRoot;

    const out = createWriteStream(logPath);
    const child = spawn('/bin/sh', ['-c', req.command], { cwd, env: process.env });
    // Merge both streams into the one log so the live view reads in chronological order.
    child.stdout.pipe(out, { end: false });
    child.stderr.pipe(out, { end: false });

    const record: ExecRecord = {
      id,
      status: 'running',
      exitCode: null,
      killedBySignal: null,
      timedOut: false,
      logPath,
      startedAt: new Date().toISOString(),
      endedAt: null,
    };

    const entry: { record: ExecRecord; child: ChildProcess; timer?: NodeJS.Timeout } = { record, child };

    if (req.timeout && req.timeout > 0) {
      entry.timer = setTimeout(() => {
        if (record.status === 'running') {
          record.timedOut = true;
          child.kill('SIGKILL');
        }
      }, req.timeout);
    }

    child.on('exit', (code, signal) => {
      if (entry.timer) clearTimeout(entry.timer);
      record.status = signal ? 'killed' : 'exited';
      record.exitCode = code;
      record.killedBySignal = signal;
      record.endedAt = new Date().toISOString();
      out.end();
    });
    child.on('error', (err) => {
      // spawn failure (e.g. /bin/sh missing): surface as a failed command, not a hung one.
      if (entry.timer) clearTimeout(entry.timer);
      record.status = 'exited';
      record.exitCode = record.exitCode ?? 1;
      record.endedAt = record.endedAt ?? new Date().toISOString();
      out.write(`\n[exec] spawn error: ${err.message}\n`);
      out.end();
    });

    this.commands.set(id, entry);
    return id;
  }

  async status(id: string): Promise<ExecStatusResponse | null> {
    const entry = this.commands.get(id);
    if (!entry) return null;
    const { record } = entry;
    return {
      id: record.id,
      status: record.status,
      exitCode: record.exitCode,
      killedBySignal: record.killedBySignal,
      timedOut: record.timedOut,
      bytesWritten: await this.fileSize(record.logPath),
      startedAt: record.startedAt,
      endedAt: record.endedAt,
    };
  }

  /** Incremental read of the merged output log from `offset` to EOF. */
  async readLog(id: string, offset: number): Promise<{ chunk: string; nextOffset: number } | null> {
    const entry = this.commands.get(id);
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

  /** Terminate a running command (SIGTERM, then SIGKILL after a grace period). */
  async kill(id: string): Promise<boolean> {
    const entry = this.commands.get(id);
    if (!entry) return false;
    entry.child.kill('SIGTERM');
    setTimeout(() => {
      if (entry.record.status === 'running') entry.child.kill('SIGKILL');
    }, KILL_GRACE_MS);
    return true;
  }

  private async fileSize(filePath: string): Promise<number> {
    try {
      return (await fs.stat(filePath)).size;
    } catch {
      return 0;
    }
  }
}
