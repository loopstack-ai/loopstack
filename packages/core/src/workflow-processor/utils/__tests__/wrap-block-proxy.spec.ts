import { InjectDocument, InjectTemplates, InjectTool, Input, Workflow } from '@loopstack/common';
import { RunContext } from '@loopstack/common';
import { ExecutionContextManager } from '../execution-context-manager';
import { StateManager } from '../state/state-manager';

// Mock tool with _run
class MockTool {
  run(_args: Record<string, unknown>) {
    return Promise.resolve({ data: 'from-run' });
  }
  _run(_args: Record<string, unknown>) {
    return Promise.resolve({ data: 'from-_run' });
  }
}

// Mock document with _create
class MockDocument {
  create(_options: Record<string, unknown>) {
    return Promise.resolve({ id: 'from-create' });
  }
  _create(_options: Record<string, unknown>) {
    return Promise.resolve({ id: 'from-_create' });
  }
}

@Workflow()
class TestWorkflow {
  @InjectTool() mockTool: MockTool;
  @InjectDocument() mockDocument: MockDocument;
  @InjectTemplates() templates: any;

  @Input({ schema: undefined })
  args: any;

  // State properties — no decorator needed
  llmResult?: any;
  counter?: number;

  // Proxy-resolved properties
  private runtime: any;
  private context: any;

  someMethod() {
    return 'method-result';
  }
}

function createExecutionContext(
  instance: any,
  metadataOverrides: Record<string, any> = {},
  args: Record<string, any> = {},
) {
  const context = new RunContext({
    workspaceId: 'test-workspace',
    options: { stateless: true },
  } as RunContext);
  const initialData = {
    place: 'start',
    tools: {},
    documents: [],
    ...metadataOverrides,
  };
  const stateManager = new StateManager(undefined, initialData, null);
  return new ExecutionContextManager(instance, context, args, stateManager);
}

describe('wrapBlockProxy', () => {
  let workflow: TestWorkflow;

  beforeEach(() => {
    workflow = new TestWorkflow();
    workflow.mockTool = new MockTool();
    workflow.mockDocument = new MockDocument();
    workflow.templates = { render: () => 'rendered' };
  });

  describe('fixed proxy properties', () => {
    it('should resolve this.runtime from ctxManager.getData()', () => {
      const ctx = createExecutionContext(workflow, {
        tools: { someTransition: { data: 'result' } },
      });
      const wrapped = ctx.getInstance() as any;
      expect(wrapped.runtime.tools).toEqual({ someTransition: { data: 'result' } });
    });

    it('should resolve this.context from ctxManager.getContext()', () => {
      const ctx = createExecutionContext(workflow);
      const wrapped = ctx.getInstance() as any;
      expect(wrapped.context.workspaceId).toBe('test-workspace');
    });

    it('should resolve this.args from ctxManager.getArgs()', () => {
      const ctx = createExecutionContext(workflow, {}, { subject: 'test' });
      const wrapped = ctx.getInstance() as any;
      expect(wrapped.args.subject).toBe('test');
    });

    it('should throw when writing to runtime', () => {
      const ctx = createExecutionContext(workflow);
      expect(() => {
        (ctx.getInstance() as any).runtime = {};
      }).toThrow('Cannot modify "runtime"');
    });

    it('should throw when writing to context', () => {
      const ctx = createExecutionContext(workflow);
      expect(() => {
        (ctx.getInstance() as any).context = {};
      }).toThrow('Cannot modify "context"');
    });

    it('should throw when writing to args', () => {
      const ctx = createExecutionContext(workflow);
      expect(() => {
        (ctx.getInstance() as any).args = {};
      }).toThrow('Cannot modify "args"');
    });
  });

  describe('automatic state persistence', () => {
    it('should write state properties to StateManager', () => {
      const ctx = createExecutionContext(workflow);
      const wrapped = ctx.getInstance() as any;

      wrapped.llmResult = { id: '123', content: 'hello' };

      expect(ctx.getManager().get('llmResult')).toEqual({ id: '123', content: 'hello' });
    });

    it('should read state properties from StateManager', () => {
      const ctx = createExecutionContext(workflow);
      ctx.getManager().set('llmResult', { id: '456' });

      const wrapped = ctx.getInstance() as any;
      expect(wrapped.llmResult).toEqual({ id: '456' });
    });

    it('should isolate state between concurrent execution contexts', () => {
      const ctxA = createExecutionContext(workflow);
      const ctxB = createExecutionContext(workflow);

      (ctxA.getInstance() as any).counter = 10;
      (ctxB.getInstance() as any).counter = 20;

      expect(ctxA.getManager().get('counter')).toBe(10);
      expect(ctxB.getManager().get('counter')).toBe(20);
    });

    it('should return undefined for unset state properties', () => {
      const ctx = createExecutionContext(workflow);
      const wrapped = ctx.getInstance() as any;
      expect(wrapped.llmResult).toBeUndefined();
    });
  });

  describe('pass-through properties', () => {
    it('should pass through methods', () => {
      const ctx = createExecutionContext(workflow);
      const wrapped = ctx.getInstance() as any;
      expect(wrapped.someMethod()).toBe('method-result');
    });

    it('should pass through @InjectTemplates property', () => {
      const ctx = createExecutionContext(workflow);
      const wrapped = ctx.getInstance() as any;
      expect(wrapped.templates.render()).toBe('rendered');
    });

    it('should throw when reassigning injected properties', () => {
      const ctx = createExecutionContext(workflow);
      expect(() => {
        (ctx.getInstance() as any).mockTool = new MockTool();
      }).toThrow('Cannot reassign injected property "mockTool"');
    });
  });

  describe('tool/document method redirect', () => {
    it('should redirect .run() to ._run() on injected tools', () => {
      const ctx = createExecutionContext(workflow);
      const wrapped = ctx.getInstance() as any;
      const tool = wrapped.mockTool;

      // The proxy should redirect .run to ._run
      expect(tool.run).not.toBe(workflow.mockTool.run);
    });

    it('should redirect .create() to ._create() on injected documents', () => {
      const ctx = createExecutionContext(workflow);
      const wrapped = ctx.getInstance() as any;
      const doc = wrapped.mockDocument;

      // The proxy should redirect .create to ._create
      expect(doc.create).not.toBe(workflow.mockDocument.create);
    });
  });
});
