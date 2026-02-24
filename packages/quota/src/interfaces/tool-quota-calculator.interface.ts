import { ToolExecutionContext, ToolResult } from '@loopstack/common';
import { QuotaUsage } from './quota.interface';

export interface ToolQuotaCalculator {
  /**
   * The quota type this calculator tracks (e.g. 'default-token').
   */
  quotaType: string;

  /**
   * Calculate actual quota usage after tool execution.
   * Return null if usage cannot be determined from the result.
   */
  calculateQuotaUsage(context: ToolExecutionContext, result: ToolResult): QuotaUsage | null;
}
