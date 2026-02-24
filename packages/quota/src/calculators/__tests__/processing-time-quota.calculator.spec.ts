import { RunContext, ToolExecutionContext, ToolResult } from '@loopstack/common';
import { ProcessingTimeQuotaCalculator } from '../processing-time-quota.calculator';

describe('ProcessingTimeQuotaCalculator', () => {
  let calculator: ProcessingTimeQuotaCalculator;
  const result: ToolResult = { data: {} };

  beforeEach(() => {
    calculator = new ProcessingTimeQuotaCalculator();
  });

  it('should have quotaType "processing-time-ms"', () => {
    expect(calculator.quotaType).toBe('processing-time-ms');
  });

  it('should return duration from context metrics', () => {
    const context: ToolExecutionContext = {
      tool: {},
      args: undefined,
      runContext: { userId: 'user-1' } as RunContext,
      metrics: { durationMs: 1500 },
    };

    expect(calculator.calculateQuotaUsage(context, result)).toEqual({
      quotaType: 'processing-time-ms',
      actualAmount: 1500,
    });
  });

  it('should return null when metrics is undefined', () => {
    const context: ToolExecutionContext = {
      tool: {},
      args: undefined,
      runContext: { userId: 'user-1' } as RunContext,
    };

    expect(calculator.calculateQuotaUsage(context, result)).toBeNull();
  });

  it('should return null when durationMs is undefined', () => {
    const context: ToolExecutionContext = {
      tool: {},
      args: undefined,
      runContext: { userId: 'user-1' } as RunContext,
      metrics: {},
    };

    expect(calculator.calculateQuotaUsage(context, result)).toBeNull();
  });

  it('should return null when durationMs is zero', () => {
    const context: ToolExecutionContext = {
      tool: {},
      args: undefined,
      runContext: { userId: 'user-1' } as RunContext,
      metrics: { durationMs: 0 },
    };

    expect(calculator.calculateQuotaUsage(context, result)).toBeNull();
  });
});
