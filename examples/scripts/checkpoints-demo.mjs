// Runs the checkpoints example through @loopstack/client from bare Node,
// waits for the run to end, and prints its checkpoint history — the places
// it passed, the transitions that moved it, and when. Start the app first
// (node dist/main). Pass an amount to take the other branch:
//   node scripts/checkpoints-demo.mjs 900
import { createClient } from '@loopstack/client';

const url = process.env.LOOPSTACK_URL ?? 'http://localhost:3000';
const client = createClient({
  url,
  token: process.env.LOOPSTACK_TOKEN,
  envKey: 'local',
});

const workspace = await client.http
  .post('/api/v1/workspaces', { title: 'checkpoints-demo', appName: 'observability_examples_app' })
  .catch((error) => {
    console.error(`✖ Cannot reach the Loopstack backend at ${url} — start it first: node dist/main`, error.message);
    process.exit(2);
  });

const run = await client.processor.start({
  workflowName: 'checkpoints_example',
  workspaceId: workspace.id,
  args: { amount: Number(process.argv[2] ?? 250) },
});
console.log(`▸ started ${run.workflowId}`);

let status;
do {
  await new Promise((resolve) => setTimeout(resolve, 250));
  ({ status } = await client.workflows.status(run.workflowId));
} while (status !== 'completed' && status !== 'failed');
console.log(`■ ${status}\n`);

const checkpoints = await client.workflows.checkpoints(run.workflowId);
console.table(
  checkpoints.map(({ version, place, transitionFrom, transitionId, createdAt }) => ({
    version,
    place,
    transitionFrom,
    transitionId,
    createdAt,
  })),
);
