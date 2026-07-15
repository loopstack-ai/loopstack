import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransitionAbortedError } from '../../../common/index.js';
import type { ExecutionScopeData } from '../../utils/index.js';
import { DocumentPersistenceService } from '../document-persistence.service.js';
import { ToolPipelineService } from '../tool-pipeline.service.js';
import { WorkflowOrchestrationService } from '../workflow-orchestration.service.js';

/**
 * A framework I/O call invoked from an abandoned (timed-out) transition must throw
 * TransitionAbortedError instead of performing its side effect. These are the enforcement points
 * for that contract: document writes, tool calls, and sub-workflow queueing.
 */
function abortedScope(): ExecutionScopeData {
  const abortController = new AbortController();
  abortController.abort();
  return {
    userId: 'u1',
    workspaceId: 'ws1',
    workflowId: 'wf1',
    labels: [],
    args: undefined,
    options: { stateless: false },
    cache: new Map(),
    queryRunner: null,
    documents: [],
    persistenceState: { documentsUpdated: false },
    transition: { id: 't1', from: null, to: 'next', payload: {} },
    abortController,
    stateDraft: {},
    resultDraft: {},
    resultDirty: false,
  };
}

describe('abort guards', () => {
  describe('DocumentPersistenceService.create', () => {
    it('throws when the owning scope is aborted', async () => {
      const scope = abortedScope();
      const repo = { create: vi.fn(), save: vi.fn() };
      const service = new DocumentPersistenceService({ get: () => scope } as never, repo as never);

      await expect(service.create('doc', {}, {}, undefined)).rejects.toBeInstanceOf(TransitionAbortedError);
      expect(repo.save).not.toHaveBeenCalled();
    });
  });

  describe('ToolPipelineService.execute', () => {
    it('throws when the owning scope is aborted', async () => {
      const scope = abortedScope();
      const service = new ToolPipelineService({ getOptional: () => scope } as never, {} as never);
      const tool = { handle: vi.fn() };

      await expect(service.execute(tool as never, {}, undefined)).rejects.toBeInstanceOf(TransitionAbortedError);
      expect(tool.handle).not.toHaveBeenCalled();
    });
  });

  describe('WorkflowOrchestrationService.queue', () => {
    it('throws when the owning scope is aborted', async () => {
      const scope = abortedScope();
      const schedulerAddTask = vi.fn();
      const service = new WorkflowOrchestrationService(
        { get: () => scope } as never,
        {} as never,
        { addTask: schedulerAddTask } as never,
        {} as never,
        {} as never,
        {} as never,
      );

      await expect(service.queue(class {} as never)).rejects.toBeInstanceOf(TransitionAbortedError);
      expect(schedulerAddTask).not.toHaveBeenCalled();
    });
  });
});
