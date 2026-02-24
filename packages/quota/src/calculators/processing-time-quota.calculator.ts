import { ToolExecutionContext, ToolResult } from '@loopstack/common';
import { QuotaUsage } from '../interfaces/quota.interface';
import { ToolQuotaCalculator } from '../interfaces/tool-quota-calculator.interface';

export class ProcessingTimeQuotaCalculator implements ToolQuotaCalculator {
  quotaType = 'processing-time-ms';

  calculateQuotaUsage(context: ToolExecutionContext, _result: ToolResult): QuotaUsage | null {
    const durationMs = context.metrics?.durationMs;
    if (typeof durationMs !== 'number' || durationMs === 0) return null;
    return { quotaType: this.quotaType, actualAmount: durationMs };
  }
}
