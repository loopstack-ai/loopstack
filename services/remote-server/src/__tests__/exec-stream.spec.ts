import { mkdtempSync, readFileSync, realpathSync, rmSync } from 'fs';
import type { Server } from 'http';
import type { AddressInfo } from 'net';
import { tmpdir } from 'os';
import { join } from 'path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

interface ExecStatus {
  id: string;
  status: 'running' | 'exited' | 'killed';
  exitCode: number | null;
  killedBySignal: string | null;
  timedOut: boolean;
  bytesWritten: number;
  startedAt: string;
  endedAt: string | null;
}

describe('/exec/stream', () => {
  let server: Server;
  let baseUrl: string;
  let workspaceRoot: string;

  beforeAll(async () => {
    // WORKSPACE_ROOT is read at import time, so set it before loading the app.
    workspaceRoot = realpathSync(mkdtempSync(join(tmpdir(), 'remote-server-ws-')));
    process.env.WORKSPACE_ROOT = workspaceRoot;
    const { createApp } = await import('../create-app.js');

    server = await new Promise<Server>((resolve) => {
      const s = createApp().listen(0, '127.0.0.1', () => resolve(s));
    });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    server.closeAllConnections(); // drop fetch's keep-alive sockets so the listener can close
    await new Promise<void>((resolve) => server.close(() => resolve()));
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  async function request<T>(method: string, path: string, body?: unknown): Promise<{ status: number; data: T }> {
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, data: (await res.json()) as T };
  }

  async function start(body: { command: string; cwd?: string; timeout?: number }): Promise<string> {
    const { status, data } = await request<{ id: string }>('POST', '/exec/stream', body);
    expect(status).toBe(200);
    expect(typeof data.id).toBe('string');
    return data.id;
  }

  async function waitForExit(id: string, deadlineMs = 10_000): Promise<ExecStatus> {
    const until = Date.now() + deadlineMs;
    for (;;) {
      const { data } = await request<ExecStatus>('GET', `/exec/stream/${id}`);
      if (data.status !== 'running') return data;
      if (Date.now() > until) throw new Error(`command ${id} still running after ${deadlineMs}ms`);
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  it('runs a command and serves its merged output by offset', async () => {
    const id = await start({ command: 'echo hi' });

    const status = await waitForExit(id);
    expect(status).toMatchObject({ id, status: 'exited', exitCode: 0, timedOut: false, killedBySignal: null });
    expect(status.endedAt).not.toBeNull();

    const first = await request<{ chunk: string; nextOffset: number }>('GET', `/exec/stream/${id}/log?offset=0`);
    expect(first.data).toEqual({ chunk: 'hi\n', nextOffset: 3 });

    const rest = await request<{ chunk: string; nextOffset: number }>('GET', `/exec/stream/${id}/log?offset=3`);
    expect(rest.data).toEqual({ chunk: '', nextOffset: 3 });
  });

  it('runs in WORKSPACE_ROOT by default and resolves cwd against it', async () => {
    const id = await start({ command: 'pwd' });
    await waitForExit(id);
    const { data } = await request<{ chunk: string }>('GET', `/exec/stream/${id}/log?offset=0`);
    expect(data.chunk.trim()).toBe(workspaceRoot);

    const rootId = await start({ command: 'pwd', cwd: '/' });
    await waitForExit(rootId);
    const root = await request<{ chunk: string }>('GET', `/exec/stream/${rootId}/log?offset=0`);
    expect(root.data.chunk.trim()).toBe('/');
  });

  it('merges stderr and reports a non-zero exit code', async () => {
    const id = await start({ command: 'echo out; echo err 1>&2; exit 3' });

    const status = await waitForExit(id);
    expect(status).toMatchObject({ status: 'exited', exitCode: 3 });

    const { data } = await request<{ chunk: string }>('GET', `/exec/stream/${id}/log?offset=0`);
    expect(data.chunk).toContain('out\n');
    expect(data.chunk).toContain('err\n');
  });

  // The command reports the pid of a background child, so the tests can check the whole tree died —
  // not just the `sh -c` wrapper.
  const TREE_COMMAND = 'sleep 30 & echo $!; wait';

  async function readChildPid(id: string): Promise<number> {
    const until = Date.now() + 5_000;
    for (;;) {
      const { data } = await request<{ chunk: string }>('GET', `/exec/stream/${id}/log?offset=0`);
      const pid = Number(data.chunk.trim());
      if (pid > 0) return pid;
      if (Date.now() > until) throw new Error(`command ${id} never reported its child pid`);
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  /** Alive = exists and is not a zombie (an orphan under a non-reaping PID 1 lingers as one). */
  function isAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
    } catch {
      return false;
    }
    try {
      // Field 3 of /proc/<pid>/stat is the state; the command name before it is parenthesised.
      const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
      return stat.slice(stat.lastIndexOf(')') + 2)[0] !== 'Z';
    } catch {
      return true; // no procfs — the signal probe is all we have
    }
  }

  async function expectGone(pid: number): Promise<void> {
    const until = Date.now() + 5_000;
    for (;;) {
      if (!isAlive(pid)) return;
      if (Date.now() > until) throw new Error(`process ${pid} still alive`);
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  it('kills the command tree when it exceeds its timeout', async () => {
    const id = await start({ command: TREE_COMMAND, timeout: 500 });
    const childPid = await readChildPid(id);

    const status = await waitForExit(id);
    expect(status).toMatchObject({ status: 'killed', timedOut: true, killedBySignal: 'SIGKILL' });
    await expectGone(childPid);
  });

  it('kills the command tree on DELETE', async () => {
    const id = await start({ command: TREE_COMMAND });
    const childPid = await readChildPid(id);

    const kill = await request<{ ok: boolean }>('DELETE', `/exec/stream/${id}`);
    expect(kill).toEqual({ status: 200, data: { ok: true } });

    const status = await waitForExit(id);
    expect(status).toMatchObject({ status: 'killed', timedOut: false });
    await expectGone(childPid);
  });

  it('rejects a start without a command', async () => {
    const { status, data } = await request<{ error: string }>('POST', '/exec/stream', {});
    expect(status).toBe(400);
    expect(data.error).toMatch(/command/);
  });

  it('answers 404 JSON for an unknown command id', async () => {
    expect((await request('GET', '/exec/stream/unknown')).status).toBe(404);
    expect((await request('GET', '/exec/stream/unknown/log?offset=0')).status).toBe(404);
    expect(await request('DELETE', '/exec/stream/unknown')).toEqual({ status: 404, data: { ok: false } });
  });
});
