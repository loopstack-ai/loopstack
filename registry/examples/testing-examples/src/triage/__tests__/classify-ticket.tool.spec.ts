import { describe, expect, it } from 'vitest';
import { testTool } from '@loopstack/testing';
import { ClassifyTicketTool } from '../classify-ticket.tool';

/** Tool unit test: given args, assert on the returned data. */
describe('ClassifyTicketTool', () => {
  it('classifies an outage as high severity', async () => {
    const module = await testTool().forTool(ClassifyTicketTool).compile();
    const tool = module.get(ClassifyTicketTool);

    const result = await tool.call({ text: 'Production is down!' });

    expect(result.data).toMatchObject({ severity: 'high' });
  });

  it('classifies a routine question as normal severity', async () => {
    const module = await testTool().forTool(ClassifyTicketTool).compile();
    const tool = module.get(ClassifyTicketTool);

    const result = await tool.call({ text: 'How do I change my invoice address?' });

    expect(result.data).toMatchObject({ severity: 'normal', reason: 'no urgency keywords' });
  });
});
