import { Logger } from '@nestjs/common';
import { ToolEnvelope, ToolExecutionContext, ToolInterceptor, UseToolInterceptor } from '@loopstack/common';
import { QuotaCalculatorRegistry } from './quota-calculator-registry.service.js';
import { QuotaClientService } from './quota-client.service.js';

const PROCESSING_TIME_QUOTA_TYPE = 'processing-time-ms';

@UseToolInterceptor({ priority: 50 })
export class QuotaInterceptor implements ToolInterceptor {
  private readonly logger = new Logger(QuotaInterceptor.name);

  constructor(
    private readonly quotaClientService: QuotaClientService,
    private readonly calculatorRegistry: QuotaCalculatorRegistry,
  ) {}

  async intercept(context: ToolExecutionContext, next: () => Promise<ToolEnvelope>): Promise<ToolEnvelope> {
    const userId = context.runContext.userId;
    const toolClassName = context.tool.constructor.name;

    // Check quotas before execution
    const timeCheck = await this.quotaClientService.checkQuota(userId, PROCESSING_TIME_QUOTA_TYPE);
    if (timeCheck.exceeded) {
      throw new Error(`Quota exceeded for "${PROCESSING_TIME_QUOTA_TYPE}": ${timeCheck.used}/${timeCheck.limit}`);
    }

    const calculator = this.calculatorRegistry.get(toolClassName);
    if (calculator) {
      const checkResult = await this.quotaClientService.checkQuota(userId, calculator.quotaType);
      if (checkResult.exceeded) {
        throw new Error(`Quota exceeded for "${calculator.quotaType}": ${checkResult.used}/${checkResult.limit}`);
      }
    }

    // Execute the tool and measure its wall-clock duration
    const startedAt = performance.now();
    const result = await next();
    const durationMs = Math.round(performance.now() - startedAt);

    // Report usage after execution
    if (durationMs > 0) {
      await this.quotaClientService.report(userId, PROCESSING_TIME_QUOTA_TYPE, durationMs);
    }

    if (calculator) {
      const usage = calculator.calculateQuotaUsage(context, result);
      if (usage) {
        await this.quotaClientService.report(userId, usage.quotaType, usage.actualAmount);
      }
    }

    return result;
  }
}
