import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { BaseTool, Document, Tool, ToolEnvelope } from '@loopstack/common';
import { ExecutionScope, ExecutionScopeData, RunTraceCollector } from '../../utils/index.js';
import { DocumentStore, resolveDocumentClass } from '../document-store.service.js';
import { ToolPipelineService } from '../tool-pipeline.service.js';

@Document({ schema: z.object({ text: z.string() }) })
class SpecNoteDocument {
  text: string;
}

@Tool({ name: 'declaring', schema: z.object({ text: z.string() }) })
class DeclaringTool extends BaseTool<{ text: string }, object, string> {
  protected async handle(args: { text: string }): Promise<ToolEnvelope<string>> {
    return Promise.resolve({
      data: 'ok',
      documents: [{ documentName: 'spec_note', content: { text: args.text }, options: { key: 'note-1' } }],
    });
  }
}

@Tool({ name: 'unknown_declaring' })
class UnknownDeclaringTool extends BaseTool<object, object, string> {
  protected async handle(): Promise<ToolEnvelope<string>> {
    return Promise.resolve({
      data: 'ok',
      documents: [{ documentName: 'no_such_document', content: {} }],
    });
  }
}

@Tool({ name: 'failing_declaring' })
class FailingDeclaringTool extends BaseTool<object, object, never> {
  protected async handle(): Promise<ToolEnvelope<never>> {
    return Promise.resolve({
      error: 'it broke',
      documents: [{ documentName: 'spec_note', content: { text: 'should not be saved' } }],
    });
  }
}

@Tool({ name: 'plain' })
class PlainTool extends BaseTool<object, object, string> {
  protected async handle(): Promise<ToolEnvelope<string>> {
    return Promise.resolve({ data: 'plain' });
  }
}

const makeScopeData = (trace: RunTraceCollector): ExecutionScopeData =>
  ({
    userId: 'u1',
    workspaceId: 'ws1',
    workflowId: 'wf1',
    workflowName: 'test_workflow',
    labels: [],
    args: undefined,
    options: { stateless: true },
    cache: new Map(),
    queryRunner: null,
    documents: [],
    persistenceState: { documentsUpdated: false },
    transition: { id: 'work', from: 'a', to: 'b', payload: null },
    trace,
    tracePersist: false,
    abortController: new AbortController(),
    stateDraft: {},
    resultDraft: {},
    resultDirty: false,
  }) as ExecutionScopeData;

const makePipeline = (documentStore: { save: ReturnType<typeof vi.fn> }, scope = new ExecutionScope()) => ({
  scope,
  pipeline: new ToolPipelineService(scope, {} as never, documentStore as unknown as DocumentStore),
});

describe('resolveDocumentClass', () => {
  it('resolves a registered document class from its derived name', () => {
    expect(resolveDocumentClass('spec_note')).toBe(SpecNoteDocument);
  });

  it('throws for an unknown name, naming the declaring tool', () => {
    expect(() => resolveDocumentClass('nope', 'my_tool')).toThrow(/Unknown document 'nope' declared by tool 'my_tool'/);
  });
});

describe('ToolPipelineService — envelope-declared documents', () => {
  it('applies declarations on success envelopes via the document store', async () => {
    const save = vi.fn().mockResolvedValue({});
    const { scope, pipeline } = makePipeline({ save });
    const trace = new RunTraceCollector();

    const envelope = await scope.run(makeScopeData(trace), () =>
      pipeline.execute(new DeclaringTool(), { text: 'hello' }),
    );

    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(SpecNoteDocument, { text: 'hello' }, { key: 'note-1' });
    expect(envelope.data).toBe('ok');
    expect(trace.events.map((e) => e.type)).toEqual(['tool.called', 'tool.completed']);
  });

  it('applies declarations from a chain-substituted envelope (the replay path)', async () => {
    const save = vi.fn().mockResolvedValue({});
    const { scope, pipeline } = makePipeline({ save });

    const substituted: ToolEnvelope = {
      data: 'replayed',
      documents: [{ documentName: 'spec_note', content: { text: 'from recording' } }],
    };
    (pipeline as unknown as { interceptors: unknown[] }).interceptors = [
      { intercept: () => Promise.resolve(substituted) },
    ];

    const envelope = await scope.run(makeScopeData(new RunTraceCollector()), () =>
      pipeline.execute(new PlainTool(), {}),
    );

    expect(envelope.data).toBe('replayed');
    expect(save).toHaveBeenCalledWith(SpecNoteDocument, { text: 'from recording' }, undefined);
  });

  it('fails the call on an unknown documentName, naming document and tool', async () => {
    const save = vi.fn().mockResolvedValue({});
    const { scope, pipeline } = makePipeline({ save });
    const trace = new RunTraceCollector();

    await expect(
      scope.run(makeScopeData(trace), () => pipeline.execute(new UnknownDeclaringTool(), {})),
    ).rejects.toThrow(/Unknown document 'no_such_document' declared by tool 'unknown_declaring'/);

    expect(save).not.toHaveBeenCalled();
    expect(trace.events.map((e) => e.type)).toEqual(['tool.called', 'tool.failed']);
  });

  it('fails the call when a declared save fails', async () => {
    const save = vi.fn().mockRejectedValue(new Error('schema mismatch'));
    const { scope, pipeline } = makePipeline({ save });

    await expect(
      scope.run(makeScopeData(new RunTraceCollector()), () => pipeline.execute(new DeclaringTool(), { text: 'x' })),
    ).rejects.toThrow('schema mismatch');
  });

  it('does not apply declarations on error envelopes', async () => {
    const save = vi.fn().mockResolvedValue({});
    const { scope, pipeline } = makePipeline({ save });

    const envelope = await scope.run(makeScopeData(new RunTraceCollector()), () =>
      pipeline.execute(new FailingDeclaringTool(), {}),
    );

    expect(envelope.error).toBe('it broke');
    expect(save).not.toHaveBeenCalled();
  });
});
