import { Context, Input, Runtime, Shared, State, Workflow } from '@loopstack/common';
import { RunContext } from '@loopstack/common';
import { ExecutionContextManager } from '../execution-context-manager';
import { StateManager } from '../state/state-manager';

@Workflow()
class TestWorkflow {
  @State({ schema: undefined })
  state: { message?: string };

  @Runtime()
  runtime: any;

  @Input({ schema: undefined })
  args: any;

  @Context()
  context: any;

  @Shared()
  sharedCounter = 0;

  undecorated = 'initial';
}

function createExecutionContext(instance: any, stateData: Record<string, any> = {}) {
  const context = new RunContext({
    workspaceId: 'test-workspace',
    options: { stateless: true },
  } as RunContext);
  const stateManager = new StateManager(undefined, stateData, null);
  return new ExecutionContextManager(instance, context, {}, stateManager);
}

describe('wrapBlockProxy', () => {
  let workflow: TestWorkflow;

  beforeEach(() => {
    workflow = new TestWorkflow();
  });

  describe('state isolation', () => {
    it('should read state from StateManager, not from singleton', () => {
      const ctx = createExecutionContext(workflow, {});
      ctx.getManager().setState({ message: 'from-state-manager' });

      const wrapped = ctx.getInstance() as unknown as TestWorkflow;
      expect(wrapped.state).toEqual({ message: 'from-state-manager' });
    });

    it('should isolate state between concurrent execution contexts', () => {
      const ctxA = createExecutionContext(workflow);
      const ctxB = createExecutionContext(workflow);

      ctxA.getManager().setState({ message: 'A' });
      ctxB.getManager().setState({ message: 'B' });

      expect((ctxA.getInstance() as unknown as TestWorkflow).state).toEqual({ message: 'A' });
      expect((ctxB.getInstance() as unknown as TestWorkflow).state).toEqual({ message: 'B' });
    });

    it('should redirect state writes to StateManager', () => {
      const ctx = createExecutionContext(workflow);
      const wrapped = ctx.getInstance();

      (wrapped as any).state = { message: 'updated' };

      expect(ctx.getManager().getAll()).toEqual({ message: 'updated' });
      expect(workflow.state).toBeUndefined();
    });
  });

  describe('runtime isolation', () => {
    it('should read runtime from StateManager data', () => {
      const ctx = createExecutionContext(workflow, {
        tools: { someTransition: { data: 'result' } },
      });

      const wrapped = ctx.getInstance();
      expect((wrapped as any).runtime.tools).toEqual({
        someTransition: { data: 'result' },
      });
    });

    it('should isolate runtime between concurrent execution contexts', () => {
      const ctxA = createExecutionContext(workflow, {
        tools: { t: { data: 'A' } },
      });
      const ctxB = createExecutionContext(workflow, {
        tools: { t: { data: 'B' } },
      });

      expect((ctxA.getInstance() as any).runtime.tools.t.data).toBe('A');
      expect((ctxB.getInstance() as any).runtime.tools.t.data).toBe('B');
    });

    it('should throw when writing to runtime', () => {
      const ctx = createExecutionContext(workflow);
      const wrapped = ctx.getInstance();

      expect(() => {
        (wrapped as any).runtime = {};
      }).toThrow('Cannot modify workflow runtime');
    });
  });

  describe('args and context isolation', () => {
    it('should throw when writing to args', () => {
      const ctx = createExecutionContext(workflow);
      expect(() => {
        (ctx.getInstance() as any).args = {};
      }).toThrow('Cannot modify workflow arguments');
    });

    it('should throw when writing to context', () => {
      const ctx = createExecutionContext(workflow);
      expect(() => {
        (ctx.getInstance() as any).context = {};
      }).toThrow('Cannot modify workflow context');
    });
  });

  describe('@Shared properties', () => {
    it('should allow writes to @Shared properties', () => {
      const ctx = createExecutionContext(workflow);
      const wrapped = ctx.getInstance();

      (wrapped as any).sharedCounter = 5;
      expect(workflow.sharedCounter).toBe(5);
    });

    it('should share @Shared properties across execution contexts (singleton)', () => {
      const ctxA = createExecutionContext(workflow);
      const ctxB = createExecutionContext(workflow);

      (ctxA.getInstance() as any).sharedCounter = 10;
      expect((ctxB.getInstance() as any).sharedCounter).toBe(10);
    });
  });

  describe('strict set trap', () => {
    it('should throw when writing to undecorated properties', () => {
      const ctx = createExecutionContext(workflow);
      const wrapped = ctx.getInstance();

      expect(() => {
        (wrapped as any).undecorated = 'modified';
      }).toThrow(/Cannot set property "undecorated" on block during execution/);
    });

    it('should suggest @State or @Shared in the error message', () => {
      const ctx = createExecutionContext(workflow);
      const wrapped = ctx.getInstance();

      expect(() => {
        (wrapped as any).undecorated = 'modified';
      }).toThrow(/@State\(\).*@Shared\(\)/);
    });

    it('should not modify the singleton when write is blocked', () => {
      const ctx = createExecutionContext(workflow);
      const wrapped = ctx.getInstance();

      try {
        (wrapped as any).undecorated = 'modified';
      } catch {
        // expected
      }

      expect(workflow.undecorated).toBe('initial');
    });
  });
});
