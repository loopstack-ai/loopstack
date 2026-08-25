import { beforeEach, describe, expect, it } from 'vitest';
import { ToolEnvelope, ToolExecutionContext } from '@loopstack/common';
import { ProcessingTimeQuotaCalculator } from '../processing-time-quota.calculator.js';

describe('ProcessingTimeQuotaCalculator', () => {
  let calculator: ProcessingTimeQuotaCalculator;
  const result: ToolEnvelope = { data: {} };

  beforeEach(() => {
    calculator = new ProcessingTimeQuotaCalculator();
  });

  it('should have quotaType "processing-time-ms"', () => {
    expect(calculator.quotaType).toBe('processing-time-ms');
  });

  it('should return duration from context metadata', () => {
    const context: ToolExecutionContext = {
      tool: {},
      args: undefined,
      runContext: {
        userId: 'user-1',
        workspaceId: 'ws-1',
        workflowId: '',
        args: undefined,
        signal: new AbortController().signal,
      },
      metadata: { durationMs: 1500 },
    };

    expect(calculator.calculateQuotaUsage(context, result)).toEqual({
      quotaType: 'processing-time-ms',
      actualAmount: 1500,
    });
  });

  it('should return null when metadata has no durationMs', () => {
    const context: ToolExecutionContext = {
      tool: {},
      args: undefined,
      runContext: {
        userId: 'user-1',
        workspaceId: 'ws-1',
        workflowId: '',
        args: undefined,
        signal: new AbortController().signal,
      },
      metadata: {},
    };

    expect(calculator.calculateQuotaUsage(context, result)).toBeNull();
  });

  it('should return null when durationMs is zero', () => {
    const context: ToolExecutionContext = {
      tool: {},
      args: undefined,
      runContext: {
        userId: 'user-1',
        workspaceId: 'ws-1',
        workflowId: '',
        args: undefined,
        signal: new AbortController().signal,
      },
      metadata: { durationMs: 0 },
    };

    expect(calculator.calculateQuotaUsage(context, result)).toBeNull();
  });
});
