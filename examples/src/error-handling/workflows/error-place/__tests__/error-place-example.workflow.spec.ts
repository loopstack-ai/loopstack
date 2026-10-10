import { describe, expect, it } from 'vitest';
import { WorkflowProcessorService } from '@loopstack/core';
import { createStatelessContext, createWorkflowTest, runWorkflow } from '@loopstack/testing';
import { FlakyServiceTool } from '../../../tools/flaky-service.tool';
import { ErrorPlaceExampleWorkflow } from '../error-place-example.workflow';

describe('ErrorPlaceExampleWorkflow', () => {
  it('routes the failed service call to the error place', async () => {
    const run = await runWorkflow(ErrorPlaceExampleWorkflow, undefined, { providers: [FlakyServiceTool] });

    expect(run.status).toBe('failed');
    expect(run.error).toBe('Simulated external service error');
    expect(run.place).toBe('service_failed');
    expect(run.raw.availableTransitions.map((t) => t.id)).toEqual(['recover']);
  });

  it('completes through the recovery transition at the error place', async () => {
    const failed = await runWorkflow(ErrorPlaceExampleWorkflow, undefined, { providers: [FlakyServiceTool] });

    // A run that failed into its error place is resumed by triggering the recovery transition —
    // what the Recover button does. The facade's answer loop only resumes waiting runs, so the
    // processor is driven directly with the failed run's carrier.
    const module = await createWorkflowTest()
      .forWorkflow(ErrorPlaceExampleWorkflow)
      .withProvider(FlakyServiceTool)
      .compile();
    try {
      const recovered = await module.get(WorkflowProcessorService).process(
        module.get(ErrorPlaceExampleWorkflow),
        {},
        createStatelessContext({
          payload: { transition: { id: 'recover', workflowId: '', payload: {} } },
          statelessState: failed.raw.statelessState,
        }),
      );

      expect(recovered.status).toBe('completed');
      expect(recovered.result).toEqual({ recovered: true });
    } finally {
      await module.close();
    }
  });
});
