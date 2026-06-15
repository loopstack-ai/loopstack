import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockConfig } from '@loopstack/common';
import { WorkflowProcessorService } from '@loopstack/core';
import { createContext, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { RunSubWorkflowExampleErrorHandlingWorkflow } from '../run-sub-workflow-example-error-handling.workflow';
import { RunSubWorkflowExampleFailingSubWorkflow } from '../run-sub-workflow-example-failing-sub.workflow';

const mockFailingSub = {
  run: vi.fn(),
};

describe('RunSubWorkflowExampleErrorHandlingWorkflow', () => {
  let module: TestingModule;
  let workflow: RunSubWorkflowExampleErrorHandlingWorkflow;
  let processor: WorkflowProcessorService;

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createWorkflowTest()
      .forWorkflow(RunSubWorkflowExampleErrorHandlingWorkflow)
      .withMock(RunSubWorkflowExampleFailingSubWorkflow, mockFailingSub)
      .compile();

    workflow = module.get(RunSubWorkflowExampleErrorHandlingWorkflow);
    processor = module.get(WorkflowProcessorService);
  });

  afterEach(async () => {
    if (module) await module.close();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(workflow).toBeDefined();
    });

    it('should have config defined', () => {
      expect(getBlockConfig(workflow)).toBeDefined();
    });
  });

  describe('workflow execution', () => {
    it('launches failing sub with show: inline and stops at inline_awaiting', async () => {
      mockFailingSub.run.mockResolvedValue({ workflowId: 'inline-fail-id' });

      const result = await processor.process(workflow, {}, createStatelessContext());

      expect(result.hasError).toBe(false);
      expect(result.stop).toBe(true);
      expect(result.place).toBe('inline_awaiting');
      expect(mockFailingSub.run).toHaveBeenCalledWith(
        {},
        { callback: { transition: 'onInlineFinished' }, show: 'inline', label: 'Failing sub-workflow (inline)' },
      );
    });

    it('on inline callback with hasError=true, writes the error message and launches link variant', async () => {
      const workflowId = '00000000-0000-0000-0000-000000000010';

      mockFailingSub.run.mockResolvedValue({ workflowId: 'link-fail-id' });

      const context = createContext({
        workflowEntity: { id: workflowId, place: 'inline_awaiting', documents: [] },
        payload: {
          transition: {
            id: 'onInlineFinished',
            workflowId,
            payload: {
              workflowId,
              status: 'failed',
              hasError: true,
              errorMessage: 'Demo failure: this sub-workflow is wired to always throw.',
              data: null,
            },
          },
        },
      });

      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);
      expect(result.place).toBe('link_awaiting');
      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            documentName: 'message',
            content: expect.objectContaining({
              role: 'assistant',
              text: expect.stringContaining('Inline child failed (status="failed")'),
            }),
          }),
        ]),
      );
      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            content: expect.objectContaining({
              text: expect.stringContaining('Demo failure: this sub-workflow is wired to always throw.'),
            }),
          }),
        ]),
      );
      expect(mockFailingSub.run).toHaveBeenCalledWith(
        {},
        { callback: { transition: 'onLinkFinished' }, show: 'link', label: 'Failing sub-workflow (link)' },
      );
    });

    it('on inline callback with hasError=false, writes the success branch and still launches link variant', async () => {
      const workflowId = '00000000-0000-0000-0000-000000000011';

      mockFailingSub.run.mockResolvedValue({ workflowId: 'link-success-id' });

      const context = createContext({
        workflowEntity: { id: workflowId, place: 'inline_awaiting', documents: [] },
        payload: {
          transition: {
            id: 'onInlineFinished',
            workflowId,
            payload: {
              workflowId,
              status: 'completed',
              hasError: false,
              errorMessage: null,
              data: null,
            },
          },
        },
      });

      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);
      expect(result.place).toBe('link_awaiting');
      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            documentName: 'message',
            content: expect.objectContaining({
              text: expect.stringContaining('Inline child finished normally'),
            }),
          }),
        ]),
      );
    });

    it('on link callback with hasError=true, writes the error message and ends', async () => {
      const workflowId = '00000000-0000-0000-0000-000000000020';

      const context = createContext({
        workflowEntity: { id: workflowId, place: 'link_awaiting', documents: [] },
        payload: {
          transition: {
            id: 'onLinkFinished',
            workflowId,
            payload: {
              workflowId,
              status: 'failed',
              hasError: true,
              errorMessage: 'Demo failure: this sub-workflow is wired to always throw.',
              data: null,
            },
          },
        },
      });

      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);
      expect(result.place).toBe('end');
      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            documentName: 'message',
            content: expect.objectContaining({
              text: expect.stringContaining('Link child failed (status="failed")'),
            }),
          }),
        ]),
      );
    });

    it('on link callback with hasError=false, writes the success branch and ends', async () => {
      const workflowId = '00000000-0000-0000-0000-000000000021';

      const context = createContext({
        workflowEntity: { id: workflowId, place: 'link_awaiting', documents: [] },
        payload: {
          transition: {
            id: 'onLinkFinished',
            workflowId,
            payload: {
              workflowId,
              status: 'completed',
              hasError: false,
              errorMessage: null,
              data: null,
            },
          },
        },
      });

      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);
      expect(result.place).toBe('end');
      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            documentName: 'message',
            content: expect.objectContaining({
              text: expect.stringContaining('Link child finished normally'),
            }),
          }),
        ]),
      );
    });
  });
});
