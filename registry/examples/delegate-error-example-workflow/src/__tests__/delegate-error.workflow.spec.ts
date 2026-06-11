import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ClaudeModule } from '@loopstack/claude-module';
import { WorkflowProcessorService } from '@loopstack/core';
import { LlmGenerateTextTool, LlmProviderModule } from '@loopstack/llm-provider-module';
import { ToolMock, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { DelegateErrorWorkflow } from '../delegate-error.workflow';
import { FailingSubWorkflowTool } from '../tools/failing-sub-workflow.tool';
import { RuntimeErrorTool } from '../tools/runtime-error.tool';
import { StrictSchemaTool } from '../tools/strict-schema.tool';
import { FailingWorkflow } from '../workflows/failing.workflow';

/**
 * Helper to create a mock LLM response with a single tool_use block.
 */
function mockToolUseResponse(toolName: string, args: Record<string, unknown>, toolCallId = 'toolu_test_1') {
  return {
    data: {
      message: {
        id: 'msg_test',
        role: 'assistant',
        text: `Calling ${toolName}...`,
        blocks: [
          { type: 'text', text: `Calling ${toolName}...` },
          { type: 'tool_call', id: toolCallId, name: toolName, args },
        ],
        stopReason: 'tool_use',
      },
    },
    metadata: { provider: 'claude', model: 'claude-sonnet-4-6' },
  };
}

/**
 * Helper to create a mock LLM response with end_turn (no tool calls).
 */
function mockEndTurnResponse(text: string) {
  return {
    data: {
      message: {
        id: 'msg_final',
        role: 'assistant',
        text,
        blocks: [{ type: 'text', text }],
        stopReason: 'end_turn',
      },
    },
    metadata: { provider: 'claude', model: 'claude-sonnet-4-6' },
  };
}

describe('DelegateErrorWorkflow', () => {
  let module: TestingModule;
  let workflow: DelegateErrorWorkflow;
  let processor: WorkflowProcessorService;
  let mockLlm: ToolMock;

  beforeEach(async () => {
    module = await createWorkflowTest()
      .forWorkflow(DelegateErrorWorkflow)
      .withImports(LlmProviderModule, ClaudeModule)
      .withToolOverride(LlmGenerateTextTool)
      // Real tools — we want to test actual validation and runtime errors
      .withProviders(StrictSchemaTool, RuntimeErrorTool, FailingSubWorkflowTool, FailingWorkflow)
      .compile();

    workflow = module.get(DelegateErrorWorkflow);
    processor = module.get(WorkflowProcessorService);
    mockLlm = module.get(LlmGenerateTextTool);
  });

  afterEach(async () => {
    await module.close();
  });

  it('should be defined', () => {
    expect(workflow).toBeDefined();
  });

  describe('validation error (bad schema args)', () => {
    it('should capture validation error as isError tool result and loop back to ready', async () => {
      mockLlm.call
        .mockResolvedValueOnce(mockToolUseResponse('strict_schema', {}))
        .mockResolvedValueOnce(mockEndTurnResponse('Done.'));

      const context = createStatelessContext();
      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);
      expect(result.place).toBe('end');
      expect(mockLlm.call).toHaveBeenCalledTimes(2);

      const toolResultDocs = result.documents.filter(
        (d) =>
          Array.isArray(d.content?.blocks) &&
          d.content.blocks.some((b: { type?: string; isError?: boolean }) => b.type === 'tool_result' && b.isError),
      );
      expect(toolResultDocs.length).toBeGreaterThan(0);
    });
  });

  describe('runtime error (tool throws)', () => {
    it('should capture runtime error as isError tool result and loop back to ready', async () => {
      mockLlm.call
        .mockResolvedValueOnce(mockToolUseResponse('runtime_error', { shouldFail: true }))
        .mockResolvedValueOnce(mockEndTurnResponse('Done.'));

      const context = createStatelessContext();
      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);
      expect(result.place).toBe('end');
      expect(mockLlm.call).toHaveBeenCalledTimes(2);

      const toolResultDocs = result.documents.filter(
        (d) =>
          Array.isArray(d.content?.blocks) &&
          d.content.blocks.some((b: { type?: string; isError?: boolean }) => b.type === 'tool_result' && b.isError),
      );
      expect(toolResultDocs.length).toBeGreaterThan(0);
    });
  });

  describe('successful tool call', () => {
    it('should process successful tool call without errors', async () => {
      mockLlm.call
        .mockResolvedValueOnce(mockToolUseResponse('strict_schema', { name: 'World' }))
        .mockResolvedValueOnce(mockEndTurnResponse('Done.'));

      const context = createStatelessContext();
      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);
      expect(result.place).toBe('end');
      expect(mockLlm.call).toHaveBeenCalledTimes(2);

      const errorToolResults = result.documents.filter(
        (d) =>
          Array.isArray(d.content?.blocks) &&
          d.content.blocks.some((b: { type?: string; isError?: boolean }) => b.type === 'tool_result' && b.isError),
      );
      expect(errorToolResults).toHaveLength(0);
    });
  });

  describe('error metadata in tool result documents', () => {
    it('should include validation error message in isError tool result', async () => {
      mockLlm.call
        .mockResolvedValueOnce(mockToolUseResponse('strict_schema', {}))
        .mockResolvedValueOnce(mockEndTurnResponse('Done.'));

      const context = createStatelessContext();
      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);

      const toolResultDocs = result.documents.filter(
        (d) =>
          Array.isArray(d.content?.blocks) &&
          d.content.blocks.some((b: { type?: string; isError?: boolean }) => b.type === 'tool_result' && b.isError),
      );
      expect(toolResultDocs.length).toBeGreaterThan(0);

      const errorResult = toolResultDocs[0].content.blocks.find(
        (b: { type?: string; isError?: boolean }) => b.type === 'tool_result' && b.isError,
      );
      expect(errorResult.content).toBeDefined();
      expect(errorResult.content).toContain('invalid_type');
    });

    it('should include runtime error message in isError tool result', async () => {
      mockLlm.call
        .mockResolvedValueOnce(mockToolUseResponse('runtime_error', { shouldFail: true }))
        .mockResolvedValueOnce(mockEndTurnResponse('Done.'));

      const context = createStatelessContext();
      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);

      const toolResultDocs = result.documents.filter(
        (d) =>
          Array.isArray(d.content?.blocks) &&
          d.content.blocks.some((b: { type?: string; isError?: boolean }) => b.type === 'tool_result' && b.isError),
      );
      expect(toolResultDocs.length).toBeGreaterThan(0);

      const errorResult = toolResultDocs[0].content.blocks.find(
        (b: { type?: string; isError?: boolean }) => b.type === 'tool_result' && b.isError,
      );
      expect(errorResult.content).toContain('external service unavailable');
    });
  });

  describe('validation and runtime errors produce identical structure', () => {
    it('should produce the same isError tool result shape for both error types', async () => {
      mockLlm.call
        .mockResolvedValueOnce(mockToolUseResponse('strict_schema', {}))
        .mockResolvedValueOnce(mockEndTurnResponse('Recovered.'));
      const context1 = createStatelessContext();
      const result1 = await processor.process(workflow, {}, context1);

      const validationErrorDoc = result1.documents.find(
        (d) =>
          Array.isArray(d.content?.blocks) &&
          d.content.blocks.some((b: { type?: string; isError?: boolean }) => b.type === 'tool_result' && b.isError),
      );
      const validationError = validationErrorDoc?.content.blocks.find(
        (b: { type?: string; isError?: boolean }) => b.type === 'tool_result' && b.isError,
      );

      mockLlm.call
        .mockResolvedValueOnce(mockToolUseResponse('runtime_error', { shouldFail: true }))
        .mockResolvedValueOnce(mockEndTurnResponse('Recovered.'));
      const context2 = createStatelessContext();
      const result2 = await processor.process(workflow, {}, context2);

      const runtimeErrorDoc = result2.documents.find(
        (d) =>
          Array.isArray(d.content?.blocks) &&
          d.content.blocks.some((b: { type?: string; isError?: boolean }) => b.type === 'tool_result' && b.isError),
      );
      const runtimeError = runtimeErrorDoc?.content.blocks.find(
        (b: { type?: string; isError?: boolean }) => b.type === 'tool_result' && b.isError,
      );

      expect(validationError).toBeDefined();
      expect(runtimeError).toBeDefined();
      expect(validationError.isError).toBe(true);
      expect(runtimeError.isError).toBe(true);
      expect(typeof validationError.content).toBe('string');
      expect(typeof runtimeError.content).toBe('string');
      expect(typeof validationError.toolCallId).toBe('string');
      expect(typeof runtimeError.toolCallId).toBe('string');
    });
  });
});
