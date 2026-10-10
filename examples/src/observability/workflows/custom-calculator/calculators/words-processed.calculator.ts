import { ToolEnvelope, ToolExecutionContext } from '@loopstack/common';
import { QuotaUsage, ToolQuotaCalculator } from '@loopstack/quota';
import type { AnalyzeTextToolResult } from '../tools/analyze-text.tool';

export class WordsProcessedQuotaCalculator implements ToolQuotaCalculator {
  quotaType = 'words-processed';

  calculateQuotaUsage(_context: ToolExecutionContext, result: ToolEnvelope): QuotaUsage | null {
    const data = result.data as AnalyzeTextToolResult | undefined;
    if (typeof data?.words !== 'number') {
      return null;
    }
    return { quotaType: this.quotaType, actualAmount: data.words };
  }
}
