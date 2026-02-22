import { Shared, Tool, ToolInterface, ToolResult } from '@loopstack/common';
import { RunContext } from '@loopstack/common';
import { wrapToolProxy } from '../wrap-block-proxy';

@Tool({ config: { description: 'Test tool with shared counter' } })
class SharedCounterTool implements ToolInterface {
  @Shared() count = 0;

  execute(): Promise<ToolResult> {
    this.count++;
    return Promise.resolve({ data: this.count });
  }
}

@Tool({ config: { description: 'Test tool with undecorated state' } })
class LeakyTool implements ToolInterface {
  cache: Record<string, string> = {};

  execute(args: any): Promise<ToolResult> {
    this.cache[args.key] = args.value;
    return Promise.resolve({ data: this.cache });
  }
}

describe('wrapToolProxy', () => {
  describe('@Shared properties', () => {
    it('should allow writes to @Shared properties', () => {
      const tool = new SharedCounterTool();
      const wrapped = wrapToolProxy(tool);

      (wrapped as any).count = 5;
      expect(tool.count).toBe(5);
    });

    it('should allow tool execution that writes to @Shared', async () => {
      const tool = new SharedCounterTool();
      const wrapped = wrapToolProxy(tool);

      const result = await wrapped.execute({} as any, {} as RunContext, {} as any, {} as any);
      expect(result.data).toBe(1);
      expect(tool.count).toBe(1);
    });
  });

  describe('strict set trap', () => {
    it('should throw when writing to undecorated properties', () => {
      const tool = new LeakyTool();
      const wrapped = wrapToolProxy(tool);

      expect(() => {
        (wrapped as any).cache = { key: 'value' };
      }).toThrow(/Cannot set property "cache" on tool during execution/);
    });

    it('should suggest @Shared in the error message', () => {
      const tool = new LeakyTool();
      const wrapped = wrapToolProxy(tool);

      expect(() => {
        (wrapped as any).cache = {};
      }).toThrow(/@Shared\(\)/);
    });

    it('should not modify the singleton when write is blocked', () => {
      const tool = new LeakyTool();
      const originalCache = tool.cache;
      const wrapped = wrapToolProxy(tool);

      try {
        (wrapped as any).cache = { leaked: 'data' };
      } catch {
        // expected
      }

      expect(tool.cache).toBe(originalCache);
    });

    it('should block writes to undeclared properties', () => {
      const tool = new SharedCounterTool();
      const wrapped = wrapToolProxy(tool);

      expect(() => {
        (wrapped as any).newProp = 'value';
      }).toThrow(/Cannot set property "newProp" on tool during execution/);
    });
  });

  describe('read access', () => {
    it('should allow reading any property', () => {
      const tool = new SharedCounterTool();
      tool.count = 42;
      const wrapped = wrapToolProxy(tool);

      expect((wrapped as any).count).toBe(42);
    });

    it('should allow calling methods', () => {
      const tool = new SharedCounterTool();
      const wrapped = wrapToolProxy(tool);

      expect(typeof wrapped.execute).toBe('function');
    });
  });
});
