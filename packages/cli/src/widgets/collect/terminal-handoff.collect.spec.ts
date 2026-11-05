import { spawnSync } from 'node:child_process';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CollectContext, CollectIo } from '../types.js';
import { collectTerminalHandoff } from './terminal-handoff.collect.js';

vi.mock('node:child_process', () => ({ spawnSync: vi.fn(() => ({ status: 0 })) }));

const spawnMock = vi.mocked(spawnSync);

function io(): CollectIo {
  return {
    ask: vi.fn(),
    askSecret: vi.fn(),
    out: { write: vi.fn() } as unknown as NodeJS.WritableStream,
  };
}

function ctx(overrides: Partial<CollectContext> = {}): CollectContext {
  return {
    content: { command: 'docker exec -it -w /workspace abc bash' },
    options: { transition: 'handoffDone' },
    availableTransitions: ['handoffDone'],
    ...overrides,
  };
}

const written = (out: CollectIo) =>
  vi
    .mocked(out.out.write)
    .mock.calls.map(([text]) => String(text))
    .join('');

describe('collectTerminalHandoff', () => {
  const originalStdin = process.stdin.isTTY;
  const originalStdout = process.stdout.isTTY;

  beforeEach(() => {
    spawnMock.mockClear();
    Object.defineProperty(process.stdin, 'isTTY', { value: true, configurable: true });
    Object.defineProperty(process.stdout, 'isTTY', { value: true, configurable: true });
  });

  afterEach(() => {
    Object.defineProperty(process.stdin, 'isTTY', { value: originalStdin, configurable: true });
    Object.defineProperty(process.stdout, 'isTTY', { value: originalStdout, configurable: true });
  });

  it('spawns the command with an inherited TTY and fires the declared transition on exit', async () => {
    const result = await collectTerminalHandoff(ctx(), io());

    expect(spawnMock).toHaveBeenCalledWith(
      'docker exec -it -w /workspace abc bash',
      expect.objectContaining({ shell: true, stdio: 'inherit' }),
    );
    expect(result).toEqual({ transitionId: 'handoffDone', payload: {} });
  });

  it("heads its notice with the document's title", async () => {
    const out = io();
    await collectTerminalHandoff(ctx({ content: { command: 'bash', title: 'Interactive session' } }), out);
    expect(written(out)).toContain('Interactive session — this terminal now runs the command.');
  });

  it('returns undefined without a command', async () => {
    const result = await collectTerminalHandoff(ctx({ content: {} }), io());
    expect(result).toBeUndefined();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('returns undefined when no transition resolves', async () => {
    const result = await collectTerminalHandoff(ctx({ availableTransitions: [] }), io());
    expect(result).toBeUndefined();
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('prints the command instead of spawning when not a TTY', async () => {
    Object.defineProperty(process.stdin, 'isTTY', { value: false, configurable: true });
    const out = io();
    const result = await collectTerminalHandoff(ctx(), out);
    expect(result).toBeUndefined();
    expect(spawnMock).not.toHaveBeenCalled();
    expect(written(out)).toContain('docker exec -it -w /workspace abc bash');
  });
});
