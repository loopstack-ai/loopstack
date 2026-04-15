import { Logger } from '@nestjs/common';
import { ToolExecutionContext, ToolInterceptor, ToolResult, UseToolInterceptor } from '@loopstack/common';
import { ProcessingTimeQuotaCalculator } from '../calculators';
import { QuotaCalculatorRegistry } from './quota-calculator-registry.service';
import { QuotaClientService } from './quota-client.service';

@UseToolInterceptor({ priority: 50 })
export class QuotaInterceptor implements ToolInterceptor {
  private readonly logger = new Logger(QuotaInterceptor.name);
  private readonly processingTimeCalculator = new ProcessingTimeQuotaCalculator();

  constructor(
    private readonly quotaClientService: QuotaClientService,
    private readonly calculatorRegistry: QuotaCalculatorRegistry,
  ) {}

  async intercept(context: ToolExecutionContext, next: () => Promise<ToolResult>): Promise<ToolResult> {
    const userId = context.runContext.userId;
    const toolClassName = context.tool.constructor.name;

    // Check quotas before execution
    const timeCheck = await this.quotaClientService.checkQuota(userId, this.processingTimeCalculator.quotaType);
    if (timeCheck.exceeded) {
      throw new Error(
        `Quota exceeded for "${this.processingTimeCalculator.quotaType}": ${timeCheck.used}/${timeCheck.limit}`,
      );
    }

    const calculator = this.calculatorRegistry.get(toolClassName);
    if (calculator) {
      const checkResult = await this.quotaClientService.checkQuota(userId, calculator.quotaType);
      if (checkResult.exceeded) {
        throw new Error(`Quota exceeded for "${calculator.quotaType}": ${checkResult.used}/${checkResult.limit}`);
      }
    }

    // Execute the tool
    const result = await next();

    // Report usage after execution
    const durationMs = (context.metadata.durationMs as number) ?? 0;
    const timeUsage = this.processingTimeCalculator.calculateQuotaUsage(context, result);
    if (timeUsage) {
      // Use actual duration from the logging interceptor if available
      const amount = durationMs || timeUsage.actualAmount;
      await this.quotaClientService.report(userId, timeUsage.quotaType, amount);
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
