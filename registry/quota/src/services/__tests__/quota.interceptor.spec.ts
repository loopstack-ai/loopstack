import { type Mocked, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ToolExecutionContext, ToolResult } from '@loopstack/common';
import { QuotaCalculatorRegistry } from '../quota-calculator-registry.service.js';
import { QuotaClientService } from '../quota-client.service.js';
import { QuotaInterceptor } from '../quota.interceptor.js';

class FakeTool {
  constructor(public readonly name: string) {
    Object.defineProperty(this.constructor, 'name', { value: name });
  }
}

function createContext(toolName: string, overrides?: Partial<ToolExecutionContext>): ToolExecutionContext {
  return {
    tool: new FakeTool(toolName),
    args: undefined,
    runContext: {
      userId: 'user-1',
      workspaceId: 'ws-1',
      workflowId: '',
      args: undefined,
      signal: new AbortController().signal,
    },
    metadata: {},
    ...overrides,
  };
}

describe('QuotaInterceptor', () => {
  let interceptor: QuotaInterceptor;
  let quotaClientService: Mocked<QuotaClientService>;
  let registry: QuotaCalculatorRegistry;

  const noopNext = vi.fn().mockResolvedValue({ data: {} } as ToolResult);

  beforeEach(() => {
    quotaClientService = {
      checkQuota: vi.fn().mockResolvedValue({ exceeded: false, used: 0, limit: -1 }),
      report: vi.fn().mockResolvedValue(undefined),
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
        quotaType: 'llm-cost',
        calculateQuotaUsage: vi.fn(),
      });
      const context = createContext('AiGenerateText');

      await interceptor.intercept(context, noopNext);

      expect(quotaClientService.checkQuota).toHaveBeenCalledWith('user-1', 'processing-time-ms');
      expect(quotaClientService.checkQuota).toHaveBeenCalledWith('user-1', 'llm-cost');
      expect(quotaClientService.checkQuota).toHaveBeenCalledTimes(2);
    });

    it('should throw when tool-specific quota is exceeded', async () => {
      registry.register('AiGenerateText', {
        quotaType: 'llm-cost',
        calculateQuotaUsage: vi.fn(),
      });
      quotaClientService.checkQuota
        .mockResolvedValueOnce({ exceeded: false, used: 0, limit: -1 }) // processing time OK
        .mockResolvedValueOnce({ exceeded: true, used: 1000, limit: 1000 }); // tokens exceeded
      const context = createContext('AiGenerateText');

      await expect(interceptor.intercept(context, noopNext)).rejects.toThrow(
        'Quota exceeded for "llm-cost": 1000/1000',
      );
      expect(noopNext).not.toHaveBeenCalled();
    });

    it('should not throw when all quotas are within limits', async () => {
      registry.register('AiGenerateText', {
        quotaType: 'llm-cost',
        calculateQuotaUsage: vi.fn(),
      });
      quotaClientService.checkQuota.mockResolvedValue({ exceeded: false, used: 500, limit: 1000 });
      const context = createContext('AiGenerateText');

      await expect(interceptor.intercept(context, noopNext)).resolves.toBeDefined();
    });
  });


  describe('after execution (usage reporting)', () => {
    /** Makes the tool call appear to take `ms` on the interceptor's clock. */
    function mockToolDuration(ms: number) {
      vi.spyOn(performance, 'now').mockReturnValueOnce(1000).mockReturnValueOnce(1000 + ms);
    }

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should report the measured duration of the tool call as processing time', async () => {
      const context = createContext('UnknownTool');
      const slowNext = () => new Promise<ToolResult>((resolve) => setTimeout(() => resolve({ data: {} }), 50));

      await interceptor.intercept(context, slowNext);

      expect(quotaClientService.report).toHaveBeenCalledTimes(1);
      const [userId, quotaType, amount] = quotaClientService.report.mock.calls[0];
      expect(userId).toBe('user-1');
      expect(quotaType).toBe('processing-time-ms');
      expect(amount).toBeGreaterThanOrEqual(45);
    });

    it('should report processing time rounded to whole milliseconds', async () => {
      mockToolDuration(250.4);
      const context = createContext('UnknownTool');

      await interceptor.intercept(context, noopNext);

      expect(quotaClientService.report).toHaveBeenCalledWith('user-1', 'processing-time-ms', 250);
    });

    it('should not report processing time when the call took under a millisecond', async () => {
      mockToolDuration(0.4);
      const context = createContext('UnknownTool');

      await interceptor.intercept(context, noopNext);

      expect(quotaClientService.report).not.toHaveBeenCalled();
    });

    it('should report tool-specific usage when calculator returns usage', async () => {
      registry.register('AiGenerateText', {
        quotaType: 'llm-cost',
        calculateQuotaUsage: vi.fn().mockReturnValue({ quotaType: 'llm-cost', actualAmount: 500 }),
      });
      mockToolDuration(1000);
      const context = createContext('AiGenerateText');

      await interceptor.intercept(context, noopNext);

      expect(quotaClientService.report).toHaveBeenCalledWith('user-1', 'processing-time-ms', 1000);
      expect(quotaClientService.report).toHaveBeenCalledWith('user-1', 'llm-cost', 500);
      expect(quotaClientService.report).toHaveBeenCalledTimes(2);
    });

    it('should not report tool-specific usage when calculator returns null', async () => {
      registry.register('AiGenerateText', {
        quotaType: 'llm-cost',
        calculateQuotaUsage: vi.fn().mockReturnValue(null),
      });
      mockToolDuration(100);
      const context = createContext('AiGenerateText');

      await interceptor.intercept(context, noopNext);

      expect(quotaClientService.report).toHaveBeenCalledTimes(1);
      expect(quotaClientService.report).toHaveBeenCalledWith('user-1', 'processing-time-ms', 100);
    });
  });
});
