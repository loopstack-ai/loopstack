import { describe, expect, it } from 'vitest';
import { AiGenerateTextQuotaCalculator } from '../calculators/index.js';
import { QuotaModule } from '../quota.module.js';
import { QuotaCalculatorRegistry } from '../services/index.js';

describe('QuotaModule', () => {
  it.each(['LlmGenerateTextTool', 'LlmGenerateObjectTool', 'WebFetchTool'])(
    'meters %s with the llm-cost calculator',
    (toolClassName) => {
      const registry = new QuotaCalculatorRegistry();
      new QuotaModule(registry).onModuleInit();

      const calculator = registry.get(toolClassName);
      expect(calculator).toBeInstanceOf(AiGenerateTextQuotaCalculator);
      expect(calculator?.quotaType).toBe('llm-cost');
    },
  );
});
