import { ToolExecutionContext, ToolResult } from '@loopstack/common';
import { QuotaUsage } from '../interfaces/quota.interface';
import { ToolQuotaCalculator } from '../interfaces/tool-quota-calculator.interface';
import { getModelPricing } from './model-pricing';

export class AiGenerateTextQuotaCalculator implements ToolQuotaCalculator {
  quotaType = 'llm-cost';

  calculateQuotaUsage(_context: ToolExecutionContext, result: ToolResult): QuotaUsage | null {
    const metadata = result.metadata as
      | {
          provider?: string;
          model?: string;
          usage?: {
            inputTokens?: number;
            outputTokens?: number;
            cacheCreationInputTokens?: number;
            cacheReadInputTokens?: number;
            reasoningTokens?: number;
          };
        }
      | undefined;

    const usage = metadata?.usage;
    if (!usage) return null;

    const provider = metadata?.provider ?? '';
    const model = metadata?.model ?? '';
    const pricing = getModelPricing(provider, model);

    const inputTokens = usage.inputTokens ?? 0;
    const outputTokens = (usage.outputTokens ?? 0) + (usage.reasoningTokens ?? 0);
    const cacheCreationTokens = usage.cacheCreationInputTokens ?? 0;
    const cacheReadTokens = usage.cacheReadInputTokens ?? 0;

    const cost =
      (inputTokens / 1_000_000) * pricing.inputPerMToken +
      (outputTokens / 1_000_000) * pricing.outputPerMToken +
      (cacheCreationTokens / 1_000_000) * (pricing.cacheCreationPerMToken ?? pricing.inputPerMToken) +
      (cacheReadTokens / 1_000_000) * (pricing.cacheReadPerMToken ?? pricing.inputPerMToken * 0.1);

    if (cost === 0) return null;

    // Store cost in microcents (1 USD = 100_000_000 microcents) for integer precision
    const microcents = Math.round(cost * 100_000_000);

    return { quotaType: this.quotaType, actualAmount: microcents };
  }
}
