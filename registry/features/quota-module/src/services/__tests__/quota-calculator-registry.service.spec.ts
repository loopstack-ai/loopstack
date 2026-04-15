import { ToolExecutionContext, ToolResult } from '@loopstack/common';
import { ToolQuotaCalculator } from '../../interfaces/tool-quota-calculator.interface';
import { QuotaCalculatorRegistry } from '../quota-calculator-registry.service';

class MockCalculator implements ToolQuotaCalculator {
  quotaType = 'test-type';
  calculateQuotaUsage(_context: ToolExecutionContext, _result: ToolResult) {
    return { quotaType: this.quotaType, actualAmount: 42 };
  }
}

describe('QuotaCalculatorRegistry', () => {
  let registry: QuotaCalculatorRegistry;

  beforeEach(() => {
    registry = new QuotaCalculatorRegistry();
  });

  it('should register and retrieve a calculator', () => {
    const calculator = new MockCalculator();
    registry.register('TestTool', calculator);

    expect(registry.get('TestTool')).toBe(calculator);
  });

  it('should return undefined for unregistered tools', () => {
    expect(registry.get('UnknownTool')).toBeUndefined();
  });

  it('should report has correctly', () => {
    const calculator = new MockCalculator();
    registry.register('TestTool', calculator);

    expect(registry.has('TestTool')).toBe(true);
    expect(registry.has('UnknownTool')).toBe(false);
  });

  it('should override a previously registered calculator', () => {
    const calculator1 = new MockCalculator();
    const calculator2 = new MockCalculator();
    calculator2.quotaType = 'overridden-type';

    registry.register('TestTool', calculator1);
    registry.register('TestTool', calculator2);

    expect(registry.get('TestTool')).toBe(calculator2);
  });

  it('should allow registering the same calculator for multiple tools', () => {
    const calculator = new MockCalculator();
    registry.register('ToolA', calculator);
    registry.register('ToolB', calculator);

    expect(registry.get('ToolA')).toBe(calculator);
    expect(registry.get('ToolB')).toBe(calculator);
  });
});
