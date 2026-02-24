import { Injectable, Logger } from '@nestjs/common';
import { ToolExecutionContext, ToolExecutionInterceptor, ToolResult } from '@loopstack/common';
import { ProcessingTimeQuotaCalculator } from '../calculators';
import { QuotaCalculatorRegistry } from './quota-calculator-registry.service';
import { QuotaClientService } from './quota-client.service';

@Injectable()
export class QuotaInterceptor implements ToolExecutionInterceptor {
  private readonly logger = new Logger(QuotaInterceptor.name);
  private readonly processingTimeCalculator = new ProcessingTimeQuotaCalculator();

  constructor(
    private readonly quotaClientService: QuotaClientService,
    private readonly calculatorRegistry: QuotaCalculatorRegistry,
  ) {}

  async beforeExecute(context: ToolExecutionContext): Promise<void> {
    const userId = context.runContext.userId;

    // Check processing time quota for every tool
    const timeCheck = await this.quotaClientService.checkQuota(userId, this.processingTimeCalculator.quotaType);
    if (timeCheck.exceeded) {
      throw new Error(
        `Quota exceeded for "${this.processingTimeCalculator.quotaType}": ${timeCheck.used}/${timeCheck.limit}`,
      );
    }

    // Check tool-specific quota if a calculator is registered
    const toolClassName = context.tool.constructor.name;
    const calculator = this.calculatorRegistry.get(toolClassName);
    if (!calculator) return;

    const checkResult = await this.quotaClientService.checkQuota(userId, calculator.quotaType);
    if (checkResult.exceeded) {
      throw new Error(`Quota exceeded for "${calculator.quotaType}": ${checkResult.used}/${checkResult.limit}`);
    }
  }

  async afterExecute(context: ToolExecutionContext, result: ToolResult): Promise<void> {
    const userId = context.runContext.userId;

    // Report processing time for every tool execution
    const timeUsage = this.processingTimeCalculator.calculateQuotaUsage(context, result);
    if (timeUsage) {
      await this.quotaClientService.report(userId, timeUsage.quotaType, timeUsage.actualAmount);
    }

    // Report tool-specific usage if a calculator is registered
    const toolClassName = context.tool.constructor.name;
    const calculator = this.calculatorRegistry.get(toolClassName);
    if (!calculator) return;

    const usage = calculator.calculateQuotaUsage(context, result);
    if (!usage) return;

    await this.quotaClientService.report(userId, usage.quotaType, usage.actualAmount);
  }

  async onError(_context: ToolExecutionContext, _error: unknown): Promise<void> {
    // No cleanup needed
  }
}
