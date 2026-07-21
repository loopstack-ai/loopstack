import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ExecutionScope, ExecutionScopeData } from '../../utils/index.js';
import { ToolCallAuditInterceptor } from '../tool-call-audit.interceptor.js';

describe('ToolCallAuditInterceptor', () => {
  let scope: ExecutionScope;
  let save: ReturnType<typeof vi.fn>;
  let recordToolCalls: boolean;

  const makeInterceptor = () => {
    const configService = { get: vi.fn(() => recordToolCalls) };
    return new ToolCallAuditInterceptor(configService as never, scope, { save } as never);
  };

  const scopeData = (overrides: Partial<ExecutionScopeData> = {}): ExecutionScopeData =>
    ({
      userId: 'u1',
      workspaceId: 'ws1',
      workflowId: 'wf1',
      labels: [],
      args: undefined,
      options: { stateless: false },
      cache: new Map(),
      queryRunner: null,
      documents: [],
      persistenceState: { documentsUpdated: false },
      transition: { id: 'doWork', from: 'start', to: 'done', payload: null },
      abortController: new AbortController(),
      stateDraft: {},
      resultDraft: {},
      resultDirty: false,
      ...overrides,
    }) as ExecutionScopeData;

  const context = { tool: {}, args: { q: 1 }, runContext: {} as never, metadata: {} };
  const next = vi.fn(async () => ({ data: 'ok' }));

  beforeEach(() => {
    scope = new ExecutionScope();
    save = vi.fn(async () => undefined);
    next.mockClear();
    recordToolCalls = true;
  });

  it('persists the call with transition key and incrementing seq', async () => {
    const interceptor = makeInterceptor();
    const data = scopeData();

    await scope.run(data, async () => {
      await interceptor.intercept(context, next);
      await interceptor.intercept(context, next);
    });

    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[0][0]).toMatchObject({
      workflowId: 'wf1',
      transitionId: 'doWork',
      place: 'start',
      seq: 0,
      envelope: { data: 'ok' },
    });
    expect(save.mock.calls[1][0]).toMatchObject({ seq: 1 });
  });

  it('is inactive when recordToolCalls is disabled', async () => {
    recordToolCalls = false;
    const interceptor = makeInterceptor();

    await scope.run(scopeData(), () => interceptor.intercept(context, next));

    expect(next).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();
  });

  it('skips stateless runs', async () => {
    const interceptor = makeInterceptor();

    await scope.run(scopeData({ options: { stateless: true } }), () => interceptor.intercept(context, next));

    expect(save).not.toHaveBeenCalled();
  });

  it('never fails the tool call when persistence throws', async () => {
    save.mockRejectedValueOnce(new Error('db down'));
    const interceptor = makeInterceptor();

    const envelope = await scope.run(scopeData(), () => interceptor.intercept(context, next));

    expect(envelope).toEqual({ data: 'ok' });
  });
});
