import { beforeEach, describe, expect, it } from 'vitest';
import { ToolExecutionContext, ToolResult } from '@loopstack/common';
import { AiGenerateTextQuotaCalculator } from '../ai-generate-text-quota.calculator.js';

describe('AiGenerateTextQuotaCalculator', () => {
  let calculator: AiGenerateTextQuotaCalculator;
  const context: ToolExecutionContext = {
    tool: {},
    args: undefined,
    loopstackContext: {
      userId: 'user-1',
      workspaceId: 'ws-1',
      workflowId: '',
      run: { args: undefined },
    },
    metadata: {},
  };

  beforeEach(() => {
    calculator = new AiGenerateTextQuotaCalculator();
  });

  it('should have quotaType "llm-cost"', () => {
    expect(calculator.quotaType).toBe('llm-cost');
  });

  it('should calculate cost using Claude Sonnet pricing', () => {
    const result: ToolResult = {
      data: {},
      metadata: {
        provider: 'claude',
        model: 'claude-sonnet-4-20250514',
        usage: { inputTokens: 1_000_000, outputTokens: 1_000_000 },
      },
    };

    // 1M input × $3/M + 1M output × $15/M = $18
    // $18 × 100_000_000 = 1_800_000_000 microcents
    expect(calculator.calculateQuotaUsage(context, result)).toEqual({
      quotaType: 'llm-cost',
      actualAmount: 1_800_000_000,
    });
  });

  it('should calculate cost using Claude Opus pricing', () => {
    const result: ToolResult = {
      data: {},
      metadata: {
        provider: 'claude',
        model: 'claude-opus-4-20250514',
        usage: { inputTokens: 1_000_000, outputTokens: 1_000_000 },
      },
    };

    // 1M input × $15/M + 1M output × $75/M = $90
    // $90 × 100_000_000 = 9_000_000_000 microcents
    expect(calculator.calculateQuotaUsage(context, result)).toEqual({
      quotaType: 'llm-cost',
      actualAmount: 9_000_000_000,
    });
  });

  it('should include cache tokens with correct pricing', () => {
    const result: ToolResult = {
      data: {},
      metadata: {
        provider: 'claude',
        model: 'claude-sonnet-4-20250514',
        usage: {
          inputTokens: 500_000,
          outputTokens: 100_000,
          cacheCreationInputTokens: 200_000,
          cacheReadInputTokens: 1_000_000,
        },
      },
    };

    // 500K input × $3/M + 100K output × $15/M + 200K cache-create × $3.75/M + 1M cache-read × $0.30/M
    // = $1.5 + $1.5 + $0.75 + $0.30 = $4.05
    // $4.05 × 100_000_000 = 405_000_000 microcents
    expect(calculator.calculateQuotaUsage(context, result)).toEqual({
      quotaType: 'llm-cost',
      actualAmount: 405_000_000,
    });
  });

  it('should include reasoning tokens as output cost (OpenAI)', () => {
    const result: ToolResult = {
      data: {},
      metadata: {
        provider: 'openai',
        model: 'gpt-4o',
        usage: { inputTokens: 1_000_000, outputTokens: 500_000, reasoningTokens: 500_000 },
      },
    };

    // 1M input × $2.5/M + (500K + 500K) output × $10/M = $2.5 + $10 = $12.5
    // $12.5 × 100_000_000 = 1_250_000_000 microcents
    expect(calculator.calculateQuotaUsage(context, result)).toEqual({
      quotaType: 'llm-cost',
      actualAmount: 1_250_000_000,
    });
  });

  it('should use fallback pricing when provider/model is unknown', () => {
    const result: ToolResult = {
      data: {},
      metadata: {
        provider: 'unknown',
        model: 'some-model',
        usage: { inputTokens: 1_000_000, outputTokens: 1_000_000 },
      },
    };

    // Falls back to Claude Sonnet pricing: $3 + $15 = $18
    expect(calculator.calculateQuotaUsage(context, result)).toEqual({
      quotaType: 'llm-cost',
      actualAmount: 1_800_000_000,
    });
  });

  it('should return null when metadata is missing', () => {
    const result: ToolResult = { data: {} };
    expect(calculator.calculateQuotaUsage(context, result)).toBeNull();
  });

  it('should return null when usage is missing from metadata', () => {
    const result: ToolResult = { data: {}, metadata: { provider: 'claude', model: 'claude-sonnet-4' } };
    expect(calculator.calculateQuotaUsage(context, result)).toBeNull();
  });

  it('should return null when all token counts are zero', () => {
    const result: ToolResult = {
      data: {},
      metadata: { provider: 'claude', model: 'claude-sonnet-4', usage: { inputTokens: 0, outputTokens: 0 } },
    };
    expect(calculator.calculateQuotaUsage(context, result)).toBeNull();
  });

  it('should handle missing provider/model gracefully', () => {
    const result: ToolResult = {
      data: {},
      metadata: { usage: { inputTokens: 1_000_000, outputTokens: 1_000_000 } },
    };

    // Falls back to default pricing
    expect(calculator.calculateQuotaUsage(context, result)).toEqual({
      quotaType: 'llm-cost',
      actualAmount: 1_800_000_000,
    });
  });
});
