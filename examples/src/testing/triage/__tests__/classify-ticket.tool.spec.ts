import type { TestingModule } from '@nestjs/testing';
import { afterEach, describe, expect, it } from 'vitest';
import { testTool } from '@loopstack/testing';
import { ClassifyTicketTool } from '../classify-ticket.tool';

/**
 * Tool unit test: the smallest testable unit — given args, assert on the returned envelope
 * data. `call()` runs the tool through the real pipeline, so the declared `resultSchema` is
 * validated on the way out.
 *
 * Acceptance criteria:
 *   C1 — urgency keywords grade a ticket as high severity, naming the matched keyword.
 *   C2 — a routine ticket grades as normal severity.
 */
describe('ClassifyTicketTool', () => {
  let module: TestingModule;
  afterEach(() => module?.close());

  it('C1: grades an outage as high severity', async () => {
    module = await testTool().forTool(ClassifyTicketTool).compile();
    const tool = module.get(ClassifyTicketTool);

    const result = await tool.call({ text: 'Production is down!' });

    expect(result.data).toMatchObject({ severity: 'high', reason: 'matched urgency keyword "down"' });
  });

  it('C2: grades a routine question as normal severity', async () => {
    module = await testTool().forTool(ClassifyTicketTool).compile();
    const tool = module.get(ClassifyTicketTool);

    const result = await tool.call({ text: 'How do I change my invoice address?' });

    expect(result.data).toMatchObject({ severity: 'normal', reason: 'no urgency keywords' });
  });
});
