import { ToolExecutionContext, ToolResult } from '@loopstack/common';
import { QuotaUsage } from '../interfaces/quota.interface';
import { ToolQuotaCalculator } from '../interfaces/tool-quota-calculator.interface';

export class AiGenerateTextQuotaCalculator implements ToolQuotaCalculator {
  quotaType = 'default-token';

  calculateQuotaUsage(_context: ToolExecutionContext, result: ToolResult): QuotaUsage | null {
    const usage = result.metadata?.usage as { inputTokens?: number; outputTokens?: number } | undefined;
    if (!usage) return null;

    const totalTokens = (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
    if (totalTokens === 0) return null;

    return { quotaType: this.quotaType, actualAmount: totalTokens };
  }
}
