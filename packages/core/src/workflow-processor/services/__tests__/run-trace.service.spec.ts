import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RunTraceEvent } from '@loopstack/contracts/types';
import { RunTraceService } from '../run-trace.service.js';

describe('RunTraceService', () => {
  let saved: Array<Record<string, unknown>>;
  let traceAllRuns: boolean;
  let service: RunTraceService;

  const context = { workflowId: 'wf1', workflowName: 'test_workflow', workspaceId: 'ws1' };

  const toolCompleted: RunTraceEvent = {
    type: 'tool.completed',
    transitionId: 'work',
    toolName: 'sum',
    toolSeq: 0,
    args: { a: 1 },
    envelope: { data: 2 },
    durationMs: 5,
    seq: 0,
    ts: 1,
  };

  beforeEach(() => {
    saved = [];
    traceAllRuns = false;
    const repository = {
      create: (row: Record<string, unknown>) => row,
      save: vi.fn(async (rows: Array<Record<string, unknown>>) => {
        saved.push(...rows);
        return rows;
      }),
      find: vi.fn(async () => []),
      query: vi.fn(async () => [{ id: 'wf1' }]),
    };
    const configService = { get: vi.fn(() => traceAllRuns) };
    service = new RunTraceService(repository as never, configService as never);
  });

  it('is enabled per run flag or globally via the trace module option, off by default', () => {
    expect(service.isEnabled(undefined)).toBe(false);
    expect(service.isEnabled(false)).toBe(false);
    expect(service.isEnabled(true)).toBe(true);

    traceAllRuns = true;
    expect(service.isEnabled(undefined)).toBe(true);
  });

  it('persists payloads verbatim', async () => {
    await service.saveBatch(context, [toolCompleted]);

    expect(saved).toHaveLength(1);
    const payload = saved[0].payload as Record<string, unknown>;
    expect(payload.args).toEqual({ a: 1 });
    expect(payload.envelope).toEqual({ data: 2 });
    expect(saved[0]).toMatchObject({
      workflowId: 'wf1',
      workflowName: 'test_workflow',
      seq: 0,
      type: 'tool.completed',
    });
  });

  it('caps oversized stateDiff values', async () => {
    const big = 'x'.repeat(5_000);
    await service.saveBatch(context, [
      {
        type: 'transition.completed',
        transitionId: 'work',
        durationMs: 1,
        stateDiff: { blob: { after: big }, small: { after: 1 } },
        resultDirty: false,
        seq: 0,
        ts: 1,
      },
    ]);

    const payload = saved[0].payload as { stateDiff: Record<string, { after?: unknown }> };
    expect(String(payload.stateDiff.blob.after)).toMatch(/^\[truncated: /);
    expect(payload.stateDiff.small.after).toBe(1);
  });

  it('returns the next free seq from the persisted maximum', async () => {
    const queryBuilder = {
      select: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      getRawOne: vi.fn(async () => ({ max: '7' })),
    };
    const repository = {
      create: (row: Record<string, unknown>) => row,
      save: vi.fn(),
      find: vi.fn(),
      query: vi.fn(),
      createQueryBuilder: vi.fn(() => queryBuilder),
    };
    const withRows = new RunTraceService(repository as never, { get: vi.fn(() => false) } as never);

    await expect(withRows.nextSeq('wf1')).resolves.toBe(8);

    queryBuilder.getRawOne = vi.fn(async () => ({ max: null }));
    await expect(withRows.nextSeq('wf1')).resolves.toBe(0);
  });

  it('never throws on persistence failure', async () => {
    const repository = {
      create: (row: Record<string, unknown>) => row,
      save: vi.fn(async () => {
        throw new Error('db down');
      }),
      find: vi.fn(),
      query: vi.fn(),
    };
    const failing = new RunTraceService(repository as never, { get: vi.fn(() => false) } as never);

    await expect(failing.saveBatch(context, [toolCompleted])).resolves.toBeUndefined();
  });
});
