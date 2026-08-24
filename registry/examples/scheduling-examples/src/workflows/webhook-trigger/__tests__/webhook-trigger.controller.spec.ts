import { describe, expect, it, vi } from 'vitest';
import type { WorkflowRunner } from '@loopstack/core';
import type { RunUserResolver } from '../../../support/run-user.resolver';
import { WebhookTriggerController } from '../webhook-trigger.controller';
import { WebhookTriggerWorkflow } from '../webhook-trigger.workflow';

/**
 * The trigger layer is decoupled from the workflow by `WorkflowRunner`, so it unit-tests as a
 * plain class: construct the controller with a fake runner and user resolver, call the handler
 * with a request body, and assert it parses the payload and launches the workflow — no HTTP,
 * no scheduler, no Postgres.
 */
describe('WebhookTriggerController', () => {
  const makeController = (userId: string | null) => {
    const run = vi.fn().mockResolvedValue({ workflowId: 'wf-1' });
    const controller = new WebhookTriggerController(
      { run } as unknown as WorkflowRunner,
      { resolve: vi.fn().mockResolvedValue(userId) } as unknown as RunUserResolver,
    );
    return { controller, run };
  };

  it('parses the webhook body into workflow args and launches the workflow', async () => {
    const { controller, run } = makeController('user-1');

    const result = await controller.onPayment({ customerEmail: 'ada@example.com', amountCents: 9900, currency: 'EUR' });

    expect(result).toEqual({ ok: true, workflowId: 'wf-1' });
    expect(run).toHaveBeenCalledWith(
      WebhookTriggerWorkflow,
      { customerEmail: 'ada@example.com', amountCents: 9900, currency: 'EUR' },
      expect.objectContaining({ userId: 'user-1' }),
    );
  });

  it('does not launch the workflow when there is no local user yet', async () => {
    const { controller, run } = makeController(null);

    const result = await controller.onPayment({ customerEmail: 'ada@example.com', amountCents: 9900, currency: 'EUR' });

    expect(result).toMatchObject({ ok: false });
    expect(run).not.toHaveBeenCalled();
  });
});
