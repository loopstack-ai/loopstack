import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { StudioDiscoveryService, WorkflowRunner } from '@loopstack/core';
import { ProcessorApiService } from './processor-api.service.js';
import type { ReadOnlyValidationService } from './read-only-validation.service.js';
import type { WorkflowApiService } from './workflow-api.service.js';

function setup(options: { rejectReadOnly?: boolean } = {}) {
  const runner = { runById: vi.fn(() => Promise.resolve({ workflowId: 'wf-1' })) } as unknown as WorkflowRunner;
  const workflows = {
    findOneById: vi.fn((id: string) => Promise.resolve({ id, place: 'waiting', workflowName: 'test' })),
  } as unknown as WorkflowApiService;
  const discovery = { getApps: () => [] } as unknown as StudioDiscoveryService;
  const readOnly = {
    assertPayloadRespectsReadOnly: vi.fn(() =>
      options.rejectReadOnly
        ? Promise.reject(new BadRequestException('Field "subject" of document "feedback_form" is read-only.'))
        : Promise.resolve(),
    ),
  } as unknown as ReadOnlyValidationService;

  const service = new ProcessorApiService(runner, workflows, discovery, readOnly);
  return { service, runner, workflows, readOnly };
}

describe('ProcessorApiService read-only wiring', () => {
  it('validates object transition payloads and proceeds when they pass', async () => {
    const { service, runner, readOnly } = setup();
    await service.processWorkflow('wf-1', 'user-1', {
      transition: { id: 'submitFeedback', workflowId: 'wf-1', payload: { subject: 'CLI', rating: 4 } },
    });
    expect(readOnly.assertPayloadRespectsReadOnly).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ id: 'wf-1' }),
      'submitFeedback',
      { subject: 'CLI', rating: 4 },
    );
    expect(runner.runById).toHaveBeenCalledTimes(1);
  });

  it('rejects and never reaches the runner when validation fails', async () => {
    const { service, runner } = setup({ rejectReadOnly: true });
    await expect(
      service.processWorkflow('wf-1', 'user-1', {
        transition: { id: 'submitFeedback', workflowId: 'wf-1', payload: { subject: 'changed' } },
      }),
    ).rejects.toThrow('read-only');
    expect(runner.runById).not.toHaveBeenCalled();
  });

  it('validates against the transition target workflow, not the followed root', async () => {
    const { service, workflows, readOnly } = setup();
    await service.processWorkflow('root-1', 'user-1', {
      transition: { id: 'submitFeedback', workflowId: 'sub-1', payload: { subject: 'CLI' } },
    });
    expect(workflows.findOneById).toHaveBeenCalledWith('sub-1', 'user-1');
    expect(readOnly.assertPayloadRespectsReadOnly).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ id: 'sub-1' }),
      'submitFeedback',
      { subject: 'CLI' },
    );
  });

  it('skips validation for non-object payloads (chat messages) and bare resumes', async () => {
    const { service, runner, readOnly } = setup();
    await service.processWorkflow('wf-1', 'user-1', {
      transition: { id: 'userMessage', workflowId: 'wf-1', payload: 'hello there' },
    });
    await service.processWorkflow('wf-1', 'user-1', {});
    expect(readOnly.assertPayloadRespectsReadOnly).not.toHaveBeenCalled();
    expect(runner.runById).toHaveBeenCalledTimes(2);
  });
});
