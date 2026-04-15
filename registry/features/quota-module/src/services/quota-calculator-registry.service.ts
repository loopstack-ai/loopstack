import { Injectable, Logger } from '@nestjs/common';
import { ToolQuotaCalculator } from '../interfaces/tool-quota-calculator.interface';

@Injectable()
export class QuotaCalculatorRegistry {
  private readonly logger = new Logger(QuotaCalculatorRegistry.name);
  private readonly calculators = new Map<string, ToolQuotaCalculator>();

  register(toolClassName: string, calculator: ToolQuotaCalculator): void {
    if (this.calculators.has(toolClassName)) {
      this.logger.warn(`Quota calculator for "${toolClassName}" already registered, overriding`);
    }
    this.calculators.set(toolClassName, calculator);
    this.logger.log(`Registered quota calculator for tool: ${toolClassName}`);
  }

  get(toolClassName: string): ToolQuotaCalculator | undefined {
    return this.calculators.get(toolClassName);
  }

  has(toolClassName: string): boolean {
    return this.calculators.has(toolClassName);
  }
}
