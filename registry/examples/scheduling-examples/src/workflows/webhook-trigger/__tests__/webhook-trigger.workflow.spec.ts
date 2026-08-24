import { describe, expect, it } from 'vitest';
import { runWorkflow } from '@loopstack/testing';
import { WebhookTriggerWorkflow } from '../webhook-trigger.workflow';

/**
 * A workflow launched by a trigger is tested like any other: with `runWorkflow` and the args
 * the trigger would pass. No cron, no HTTP server, no database — just the state machine.
 */
describe('WebhookTriggerWorkflow', () => {
  it('records a receipt with the amount formatted from minor units', async () => {
    const run = await runWorkflow(WebhookTriggerWorkflow, {
      customerEmail: 'ada@example.com',
      amountCents: 9900,
      currency: 'EUR',
    });

    expect(run.status).toBe('completed');
    expect(run.result).toMatchObject({ customerEmail: 'ada@example.com', amount: '99.00', currency: 'EUR' });
    const texts = run.documents.map((d) => (d.content as { text?: string }).text ?? '');
    expect(texts.some((t) => t.includes('Payment received: 99.00 EUR from ada@example.com'))).toBe(true);
  });
});
