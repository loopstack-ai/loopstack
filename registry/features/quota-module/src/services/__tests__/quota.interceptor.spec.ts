import { RunContext, ToolExecutionContext, ToolResult } from '@loopstack/common';
import { QuotaCalculatorRegistry } from '../quota-calculator-registry.service';
import { QuotaClientService } from '../quota-client.service';
import { QuotaInterceptor } from '../quota.interceptor';

class FakeTool {
  constructor(public readonly name: string) {
    Object.defineProperty(this.constructor, 'name', { value: name });
  }
}

function createContext(toolName: string, overrides?: Partial<ToolExecutionContext>): ToolExecutionContext {
  return {
    tool: new FakeTool(toolName),
    args: undefined,
    runContext: { userId: 'user-1' } as RunContext,
    metadata: {},
    ...overrides,
  };
}

describe('QuotaInterceptor', () => {
  let interceptor: QuotaInterceptor;
  let quotaClientService: jest.Mocked<QuotaClientService>;
  let registry: QuotaCalculatorRegistry;

  const noopNext = jest.fn().mockResolvedValue({ data: {} } as ToolResult);

  beforeEach(() => {
    quotaClientService = {
      checkQuota: jest.fn().mockResolvedValue({ exceeded: false, used: 0, limit: -1 }),
      report: jest.fn().mockResolvedValue(undefined),
    } as any;

    registry = new QuotaCalculatorRegistry();
    interceptor = new QuotaInterceptor(quotaClientService, registry);
    noopNext.mockClear();
  });

  describe('before execution (quota checks)', () => {
    it('should check processing time quota even when no calculator is registered', async () => {
      const context = createContext('UnknownTool');

      await interceptor.intercept(context, noopNext);

      expect(quotaClientService.checkQuota).toHaveBeenCalledWith('user-1', 'processing-time-ms');
      expect(quotaClientService.checkQuota).toHaveBeenCalledTimes(1);
    });

    it('should throw when processing time quota is exceeded for any tool', async () => {
      quotaClientService.checkQuota.mockResolvedValue({ exceeded: true, used: 60000, limit: 60000 });
      const context = createContext('UnknownTool');

      await expect(interceptor.intercept(context, noopNext)).rejects.toThrow(
        'Quota exceeded for "processing-time-ms": 60000/60000',
      );
      expect(noopNext).not.toHaveBeenCalled();
    });

    it('should check both processing time and tool-specific quota', async () => {
      registry.register('AiGenerateText', {
        quotaType: 'default-token',
        calculateQuotaUsage: jest.fn(),
      });
      const context = createContext('AiGenerateText');

      await interceptor.intercept(context, noopNext);

      expect(quotaClientService.checkQuota).toHaveBeenCalledWith('user-1', 'processing-time-ms');
      expect(quotaClientService.checkQuota).toHaveBeenCalledWith('user-1', 'default-token');
      expect(quotaClientService.checkQuota).toHaveBeenCalledTimes(2);
    });

    it('should throw when tool-specific quota is exceeded', async () => {
      registry.register('AiGenerateText', {
        quotaType: 'default-token',
        calculateQuotaUsage: jest.fn(),
      });
      quotaClientService.checkQuota
        .mockResolvedValueOnce({ exceeded: false, used: 0, limit: -1 }) // processing time OK
        .mockResolvedValueOnce({ exceeded: true, used: 1000, limit: 1000 }); // tokens exceeded
      const context = createContext('AiGenerateText');

      await expect(interceptor.intercept(context, noopNext)).rejects.toThrow(
        'Quota exceeded for "default-token": 1000/1000',
      );
      expect(noopNext).not.toHaveBeenCalled();
    });

    it('should not throw when all quotas are within limits', async () => {
      registry.register('AiGenerateText', {
        quotaType: 'default-token',
        calculateQuotaUsage: jest.fn(),
      });
      quotaClientService.checkQuota.mockResolvedValue({ exceeded: false, used: 500, limit: 1000 });
      const context = createContext('AiGenerateText');

      await expect(interceptor.intercept(context, noopNext)).resolves.toBeDefined();
    });
  });

  describe('after execution (usage reporting)', () => {
    it('should report processing time for every tool', async () => {
      const context = createContext('UnknownTool', { metadata: { durationMs: 250 } });

      await interceptor.intercept(context, noopNext);

      expect(quotaClientService.report).toHaveBeenCalledWith('user-1', 'processing-time-ms', 250);
    });

    it('should not report processing time when metadata has no durationMs', async () => {
      const context = createContext('UnknownTool');

      await interceptor.intercept(context, noopNext);

      expect(quotaClientService.report).not.toHaveBeenCalled();
    });

    it('should report tool-specific usage when calculator returns usage', async () => {
      registry.register('AiGenerateText', {
        quotaType: 'default-token',
        calculateQuotaUsage: jest.fn().mockReturnValue({ quotaType: 'default-token', actualAmount: 500 }),
      });
      const context = createContext('AiGenerateText', { metadata: { durationMs: 1000 } });

      await interceptor.intercept(context, noopNext);

      expect(quotaClientService.report).toHaveBeenCalledWith('user-1', 'processing-time-ms', 1000);
      expect(quotaClientService.report).toHaveBeenCalledWith('user-1', 'default-token', 500);
      expect(quotaClientService.report).toHaveBeenCalledTimes(2);
    });

    it('should not report tool-specific usage when calculator returns null', async () => {
      registry.register('AiGenerateText', {
        quotaType: 'default-token',
        calculateQuotaUsage: jest.fn().mockReturnValue(null),
      });
      const context = createContext('AiGenerateText', { metadata: { durationMs: 100 } });

      await interceptor.intercept(context, noopNext);

      expect(quotaClientService.report).toHaveBeenCalledTimes(1);
      expect(quotaClientService.report).toHaveBeenCalledWith('user-1', 'processing-time-ms', 100);
    });
  });
});
