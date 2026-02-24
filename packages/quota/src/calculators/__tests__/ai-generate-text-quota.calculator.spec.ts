import { RunContext, ToolExecutionContext, ToolResult } from '@loopstack/common';
import { AiGenerateTextQuotaCalculator } from '../ai-generate-text-quota.calculator';

describe('AiGenerateTextQuotaCalculator', () => {
  let calculator: AiGenerateTextQuotaCalculator;
  const context: ToolExecutionContext = {
    tool: {},
    args: undefined,
    runContext: { userId: 'user-1' } as RunContext,
  };

  beforeEach(() => {
    calculator = new AiGenerateTextQuotaCalculator();
  });

  it('should have quotaType "default-token"', () => {
    expect(calculator.quotaType).toBe('default-token');
  });

  it('should calculate total tokens from usage metadata', () => {
    const result: ToolResult = {
      data: {},
      metadata: { usage: { inputTokens: 100, outputTokens: 50 } },
    };

    expect(calculator.calculateQuotaUsage(context, result)).toEqual({
      quotaType: 'default-token',
      actualAmount: 150,
    });
  });

  it('should return null when metadata is missing', () => {
    const result: ToolResult = { data: {} };

    expect(calculator.calculateQuotaUsage(context, result)).toBeNull();
  });

  it('should return null when usage is missing from metadata', () => {
    const result: ToolResult = { data: {}, metadata: {} };

    expect(calculator.calculateQuotaUsage(context, result)).toBeNull();
  });

  it('should return null when both token counts are zero', () => {
    const result: ToolResult = {
      data: {},
      metadata: { usage: { inputTokens: 0, outputTokens: 0 } },
    };

    expect(calculator.calculateQuotaUsage(context, result)).toBeNull();
  });

  it('should handle missing inputTokens', () => {
    const result: ToolResult = {
      data: {},
      metadata: { usage: { outputTokens: 200 } },
    };

    expect(calculator.calculateQuotaUsage(context, result)).toEqual({
      quotaType: 'default-token',
      actualAmount: 200,
    });
  });

  it('should handle missing outputTokens', () => {
    const result: ToolResult = {
      data: {},
      metadata: { usage: { inputTokens: 300 } },
    };

    expect(calculator.calculateQuotaUsage(context, result)).toEqual({
      quotaType: 'default-token',
      actualAmount: 300,
    });
  });
});
