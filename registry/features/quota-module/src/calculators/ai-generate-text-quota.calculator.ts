import { ToolExecutionContext, ToolResult } from '@loopstack/common';
import { QuotaUsage } from '../interfaces/quota.interface';
import { ToolQuotaCalculator } from '../interfaces/tool-quota-calculator.interface';

const TOKEN_COST_WEIGHTS = {
  INPUT: 1,
  OUTPUT: 5,
  CACHE_CREATION: 1.25,
  CACHE_READ: 0.1,
};

export class AiGenerateTextQuotaCalculator implements ToolQuotaCalculator {
  quotaType = 'default-token';

  calculateQuotaUsage(_context: ToolExecutionContext, result: ToolResult): QuotaUsage | null {
    const usage = result.metadata?.usage as
      | {
          inputTokens?: number;
          outputTokens?: number;
          cacheCreationInputTokens?: number;
          cacheReadInputTokens?: number;
        }
      | undefined;
    if (!usage) return null;

    const totalTokens =
      (usage.inputTokens ?? 0) * TOKEN_COST_WEIGHTS.INPUT +
      (usage.outputTokens ?? 0) * TOKEN_COST_WEIGHTS.OUTPUT +
      (usage.cacheCreationInputTokens ?? 0) * TOKEN_COST_WEIGHTS.CACHE_CREATION +
      (usage.cacheReadInputTokens ?? 0) * TOKEN_COST_WEIGHTS.CACHE_READ;
    if (totalTokens === 0) return null;

    return { quotaType: this.quotaType, actualAmount: totalTokens };
  }
}
