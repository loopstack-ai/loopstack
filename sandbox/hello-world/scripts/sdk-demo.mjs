// Runs the hello workflow through @loopstack/client from bare Node:
// starts a run, streams its transitions and LLM tokens live, and exits on
// the terminal status. Start the app first (node dist/main).
import { createClient } from '@loopstack/client';

const url = process.env.LOOPSTACK_URL ?? 'http://localhost:3000';
const token = process.env.LOOPSTACK_TOKEN ?? (await localLogin(url));

const client = createClient({ url, token, envKey: 'local' });
const workspace = await client.http.post('/api/v1/workspaces', {
  title: 'sdk-demo',
  appName: 'hello_app',
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

/** Local-mode bootstrap: mints the dev session and reuses its JWT as bearer (PATs land with the auth work package). */
async function localLogin(baseUrl) {
  let response;
  try {
    response = await fetch(`${baseUrl}/api/v1/auth/oauth/hub`, {
      method: 'POST',
    });
  } catch {
    console.error(
      `✖ Cannot reach the Loopstack backend at ${baseUrl} — start it first: node dist/main`,
    );
    process.exit(2);
  }
  const cookie =
    response.headers
      .getSetCookie()
      .find((value) => value.includes('-access=')) ?? '';
  return decodeURIComponent(cookie.match(/-access=([^;]+)/)?.[1] ?? '');
}
