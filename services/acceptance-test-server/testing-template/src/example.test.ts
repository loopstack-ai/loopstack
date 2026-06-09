// Example test structure — delete this file and write your own tests
import { getDocuments, pollUntilComplete, scrub, startWorkflow } from './helpers';

describe('ExampleWorkflow', () => {
  it('workflow should reach completed state', async () => {
    const { workflowId } = await startWorkflow('ExampleWorkflow', { input: 'test' });
    const result = await pollUntilComplete(workflowId);
    expect(result.status).toBe('completed');
  });
});
