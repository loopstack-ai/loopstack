import { describe, expect, it, vi } from 'vitest';
import type { WorkflowRunner } from '@loopstack/core';
import { SCHEDULING_EXAMPLES_APP } from '../../../scheduling-examples.constants';
import { DirectRunController } from '../direct-run.controller';
import { DirectRunWorkflow } from '../direct-run.workflow';

/**
 * The controller is the plain WorkflowRunner call: it passes the workflow class, the args, the
 * app name and the request's user to runSync(), and answers with what runSync() returns.
 */
describe('DirectRunController', () => {
  it('runs the workflow inline as the request user and returns its status and result', async () => {
    const runSync = vi.fn().mockResolvedValue({
      workflowId: 'wf-1',
      workspaceId: 'ws-1',
      workerId: 'worker-1',
      status: 'completed',
      result: { words: 2, characters: 9 },
    });
    const controller = new DirectRunController({ runSync } as unknown as WorkflowRunner);

    const response = await controller.run('user-1', { text: 'hello you' });

    expect(runSync).toHaveBeenCalledWith(
      DirectRunWorkflow,
      { text: 'hello you' },
      { appName: SCHEDULING_EXAMPLES_APP, userId: 'user-1' },
    );
    expect(response).toEqual({ workflowId: 'wf-1', status: 'completed', result: { words: 2, characters: 9 } });
  });
});
