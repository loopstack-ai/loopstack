import { TestingModule } from '@nestjs/testing';
import { ClaudeGenerateText, ClaudeModule } from '@loopstack/claude-module';
import { LoopCoreModule, WorkflowProcessorService } from '@loopstack/core';
import { ToolMock, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { DelegateErrorWorkflow } from '../delegate-error.workflow';
import { FailingSubWorkflowTool } from '../tools/failing-sub-workflow.tool';
import { RuntimeErrorTool } from '../tools/runtime-error.tool';
import { StrictSchemaTool } from '../tools/strict-schema.tool';
import { FailingWorkflow } from '../workflows/failing.workflow';

/**
 * Helper to create a mock LLM response with a single tool_use block.
 */
function mockToolUseResponse(toolName: string, input: Record<string, unknown>, toolUseId = 'toolu_test_1') {
  return {
    data: {
      id: 'msg_test',
      role: 'assistant',
      stop_reason: 'tool_use',
      content: [
        { type: 'text', text: `Calling ${toolName}...` },
        { type: 'tool_use', id: toolUseId, name: toolName, input },
      ],
    },
  };
}

/**
 * Helper to create a mock LLM response with end_turn (no tool calls).
 */
function mockEndTurnResponse(text: string) {
  return {
    data: {
      id: 'msg_final',
      role: 'assistant',
      stop_reason: 'end_turn',
      content: [{ type: 'text', text }],
    },
  };
}

describe('DelegateErrorWorkflow', () => {
  let module: TestingModule;
  let workflow: DelegateErrorWorkflow;
  let processor: WorkflowProcessorService;
  let mockClaude: ToolMock;

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(DelegateErrorWorkflow)
      .withImports(LoopCoreModule, ClaudeModule)
      .withToolOverride(ClaudeGenerateText)
      // Real tools — we want to test actual validation and runtime errors
      .withProviders(StrictSchemaTool, RuntimeErrorTool, FailingSubWorkflowTool, FailingWorkflow)
      .compile();

    workflow = module.get(DelegateErrorWorkflow);
    processor = module.get(WorkflowProcessorService);
    mockClaude = module.get(ClaudeGenerateText);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(workflow).toBeDefined();
  });

  describe('validation error (bad schema args)', () => {
    it('should capture validation error as is_error tool result and loop back to ready', async () => {
      // LLM calls strictSchema with empty args — Zod validation will fail
      mockClaude.call
        .mockResolvedValueOnce(mockToolUseResponse('strictSchema', {}))
        .mockResolvedValueOnce(mockEndTurnResponse('Done.'));

      const context = createStatelessContext();
      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);
      expect(result.place).toBe('end');

      // ClaudeGenerateText should have been called twice:
      // 1st: LLM returns bad tool call → error fed back → loops to ready
      // 2nd: LLM sees the error and responds with end_turn
      expect(mockClaude.call).toHaveBeenCalledTimes(2);

      // Should have tool result documents with is_error
      const toolResultDocs = result.documents.filter((d) =>
        d.content?.toolResults?.some((tr: { is_error?: boolean }) => tr.is_error),
      );
      expect(toolResultDocs.length).toBeGreaterThan(0);
    });
  });

  describe('runtime error (tool throws)', () => {
    it('should capture runtime error as is_error tool result and loop back to ready', async () => {
      // LLM calls runtimeError with shouldFail: true — tool will throw
      mockClaude.call
        .mockResolvedValueOnce(mockToolUseResponse('runtimeError', { shouldFail: true }))
        .mockResolvedValueOnce(mockEndTurnResponse('Done.'));

      const context = createStatelessContext();
      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);
      expect(result.place).toBe('end');
      expect(mockClaude.call).toHaveBeenCalledTimes(2);

      const toolResultDocs = result.documents.filter((d) =>
        d.content?.toolResults?.some((tr: { is_error?: boolean }) => tr.is_error),
      );
      expect(toolResultDocs.length).toBeGreaterThan(0);
    });
  });

  describe('successful tool call', () => {
    it('should process successful tool call without errors', async () => {
      // LLM calls strictSchema with valid args
      mockClaude.call
        .mockResolvedValueOnce(mockToolUseResponse('strictSchema', { name: 'World' }))
        .mockResolvedValueOnce(mockEndTurnResponse('Done.'));

      const context = createStatelessContext();
      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);
      expect(result.place).toBe('end');
      expect(mockClaude.call).toHaveBeenCalledTimes(2);

      // No error tool results
      const errorToolResults = result.documents.filter((d) =>
        d.content?.toolResults?.some((tr: { is_error?: boolean }) => tr.is_error),
      );
      expect(errorToolResults).toHaveLength(0);
    });
  });

  describe('error metadata in tool result documents', () => {
    it('should include validation error message in is_error tool result', async () => {
      mockClaude.call
        .mockResolvedValueOnce(mockToolUseResponse('strictSchema', {}))
        .mockResolvedValueOnce(mockEndTurnResponse('Done.'));

      const context = createStatelessContext();
      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);

      const toolResultDocs = result.documents.filter((d) =>
        d.content?.toolResults?.some((tr: { is_error?: boolean }) => tr.is_error),
      );
      expect(toolResultDocs.length).toBeGreaterThan(0);

      const errorResult = toolResultDocs[0].content.toolResults.find((tr: { is_error?: boolean }) => tr.is_error);
      expect(errorResult.content).toBeDefined();
      // Zod v4 error message for missing required string field
      expect(errorResult.content).toContain('invalid_type');
    });

    it('should include runtime error message in is_error tool result', async () => {
      mockClaude.call
        .mockResolvedValueOnce(mockToolUseResponse('runtimeError', { shouldFail: true }))
        .mockResolvedValueOnce(mockEndTurnResponse('Done.'));

      const context = createStatelessContext();
      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);

      const toolResultDocs = result.documents.filter((d) =>
        d.content?.toolResults?.some((tr: { is_error?: boolean }) => tr.is_error),
      );
      expect(toolResultDocs.length).toBeGreaterThan(0);

      const errorResult = toolResultDocs[0].content.toolResults.find((tr: { is_error?: boolean }) => tr.is_error);
      expect(errorResult.content).toContain('external service unavailable');
    });
  });

  describe('validation and runtime errors produce identical structure', () => {
    it('should produce the same is_error tool result shape for both error types', async () => {
      // Run validation error
      mockClaude.call.mockResolvedValueOnce(mockToolUseResponse('strictSchema', {}));
      const context1 = createStatelessContext();
      const result1 = await processor.process(workflow, {}, context1);

      const validationErrorDoc = result1.documents.find((d) =>
        d.content?.toolResults?.some((tr: { is_error?: boolean }) => tr.is_error),
      );
      const validationError = validationErrorDoc?.content.toolResults.find((tr: { is_error?: boolean }) => tr.is_error);

      // Run runtime error (fresh module needed for clean state)
      mockClaude.call.mockResolvedValueOnce(mockToolUseResponse('runtimeError', { shouldFail: true }));
      const context2 = createStatelessContext();
      const result2 = await processor.process(workflow, {}, context2);

      const runtimeErrorDoc = result2.documents.find((d) =>
        d.content?.toolResults?.some((tr: { is_error?: boolean }) => tr.is_error),
      );
      const runtimeError = runtimeErrorDoc?.content.toolResults.find((tr: { is_error?: boolean }) => tr.is_error);

      // Both should have the same structure
      expect(validationError).toBeDefined();
      expect(runtimeError).toBeDefined();
      expect(validationError.type).toBe('tool_result');
      expect(runtimeError.type).toBe('tool_result');
      expect(validationError.is_error).toBe(true);
      expect(runtimeError.is_error).toBe(true);
      expect(typeof validationError.content).toBe('string');
      expect(typeof runtimeError.content).toBe('string');
      expect(typeof validationError.tool_use_id).toBe('string');
      expect(typeof runtimeError.tool_use_id).toBe('string');
    });
  });
});
