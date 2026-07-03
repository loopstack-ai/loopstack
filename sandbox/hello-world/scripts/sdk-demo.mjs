// Runs the hello workflow through @loopstack/client from bare Node:
// starts a run, streams its transitions and LLM tokens live, and exits on
// the terminal status. Start the app first (node dist/main).
import { createClient } from '@loopstack/client';

const url = process.env.LOOPSTACK_URL ?? 'http://localhost:3000';
const client = createClient({
  url,
  token: process.env.LOOPSTACK_TOKEN,
  envKey: 'local',
});

const workspace = await client.http
  .post('/api/v1/workspaces', { title: 'sdk-demo', appName: 'hello_app' })
  .catch((error) => {
    console.error(
      `✖ Cannot reach the Loopstack backend at ${url} — start it first: node dist/main`,
      error.message,
    );
    process.exit(2);
  });

const events = client.stream.events(); // subscribe before starting so no event is missed
const run = await client.processor.start({
  workflowName: 'hello',
  workspaceId: workspace.id,
  args: { name: 'SDK' },
});
console.log(`▸ started ${run.workflowId}`);

for await (const event of events) {
  if ('workflowId' in event && event.workflowId !== run.workflowId) continue;
  if (event.type === 'llm.response.text_delta')
    process.stdout.write(event.delta);
  if (event.type === 'llm.response.done') process.stdout.write('\n');
  if (event.type === 'workflow.updated') {
    console.log(`■ ${event.status}`);
    if (event.status === 'completed' || event.status === 'failed') break;
  }
}
client.stream.close();
