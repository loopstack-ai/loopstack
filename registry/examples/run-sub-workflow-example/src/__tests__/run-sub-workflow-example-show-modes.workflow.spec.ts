import { TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getBlockConfig } from '@loopstack/common';
import { WorkflowProcessorService } from '@loopstack/core';
import { createContext, createStatelessContext, createWorkflowTest } from '@loopstack/testing';
import { RunSubWorkflowExampleShowModesWorkflow } from '../run-sub-workflow-example-show-modes.workflow';
import { RunSubWorkflowExampleSubWorkflow } from '../run-sub-workflow-example-sub.workflow';

const mockSub = {
  run: vi.fn(),
};

describe('RunSubWorkflowExampleShowModesWorkflow', () => {
  let module: TestingModule;
  let workflow: RunSubWorkflowExampleShowModesWorkflow;
  let processor: WorkflowProcessorService;

  beforeEach(async () => {
    vi.clearAllMocks();

    module = await createWorkflowTest()
      .forWorkflow(RunSubWorkflowExampleShowModesWorkflow)
      .withMock(RunSubWorkflowExampleSubWorkflow, mockSub)
      .compile();

    workflow = module.get(RunSubWorkflowExampleShowModesWorkflow);
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
    it('launches sub with show: inline and stops at inline_started', async () => {
      mockSub.run.mockResolvedValue({ workflowId: 'inline-id' });

      const result = await processor.process(workflow, {}, createStatelessContext());

      expect(result.hasError).toBe(false);
      expect(result.stop).toBe(true);
      expect(result.place).toBe('inline_started');
      expect(mockSub.run).toHaveBeenCalledTimes(1);
      expect(mockSub.run).toHaveBeenCalledWith(
        {},
        { callback: { transition: 'onInlineDone' }, show: 'inline', label: 'Inline embed (iframe)' },
      );
    });

    it('on inline callback, writes message and launches sub with show: link', async () => {
      const workflowId = '00000000-0000-0000-0000-000000000001';

      mockSub.run.mockResolvedValue({ workflowId: 'link-id' });

      const context = createContext({
        workflowEntity: { id: workflowId, place: 'inline_started', documents: [] },
        payload: {
          transition: {
            id: 'onInlineDone',
            workflowId,
            payload: {
              workflowId,
              status: 'completed',
              hasError: false,
              errorMessage: null,
              data: { message: 'Hi from inline' },
            },
          },
        },
      });

      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);
      expect(result.place).toBe('link_started');
      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            documentName: 'message',
            content: expect.objectContaining({
              role: 'assistant',
              text: 'Inline child returned: Hi from inline',
            }),
          }),
        ]),
      );
      expect(mockSub.run).toHaveBeenCalledWith(
        {},
        { callback: { transition: 'onLinkDone' }, show: 'link', label: 'Status link card' },
      );
    });

    it('on link callback, writes message and launches sub with show: hidden', async () => {
      const workflowId = '00000000-0000-0000-0000-000000000002';

      mockSub.run.mockResolvedValue({ workflowId: 'hidden-id' });

      const context = createContext({
        workflowEntity: { id: workflowId, place: 'link_started', documents: [] },
        payload: {
          transition: {
            id: 'onLinkDone',
            workflowId,
            payload: {
              workflowId,
              status: 'completed',
              hasError: false,
              errorMessage: null,
              data: { message: 'Hi from link' },
            },
          },
        },
      });

      const result = await processor.process(workflow, {}, context);

      expect(result.hasError).toBe(false);
      expect(result.place).toBe('hidden_started');
      expect(result.documents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            documentName: 'message',
            content: expect.objectContaining({
              role: 'assistant',
              text: 'Link child returned: Hi from link',
            }),
          }),
        ]),
      );
      expect(mockSub.run).toHaveBeenCalledWith(
        {},
        { callback: { transition: 'onHiddenDone' }, show: 'hidden', label: 'Background child' },
      );
    });

    it('on hidden callback, writes message and ends', async () => {
      const workflowId = '00000000-0000-0000-0000-000000000003';

      const context = createContext({
        workflowEntity: { id: workflowId, place: 'hidden_started', documents: [] },
        payload: {
          transition: {
            id: 'onHiddenDone',
            workflowId,
            payload: {
              workflowId,
              status: 'completed',
              hasError: false,
              errorMessage: null,
              data: { message: 'Hi from hidden' },
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
              role: 'assistant',
              text: 'Hidden child returned: Hi from hidden — no LinkCard was rendered for it.',
            }),
          }),
        ]),
      );
    });
  });
});
