import { ToolEnvelope, ToolExecutionContext } from '@loopstack/common';
import { QuotaUsage } from './quota.interface.js';

export interface ToolQuotaCalculator {
  /**
   * The quota type this calculator tracks (e.g. 'llm-cost').
   */
  quotaType: string;

  /**
   * Calculate actual quota usage after tool execution.
   * Return null if usage cannot be determined from the result.
   */
  calculateQuotaUsage(context: ToolExecutionContext, result: ToolEnvelope): QuotaUsage | null;
}
