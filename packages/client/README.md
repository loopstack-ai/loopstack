# @loopstack/client

The headless TypeScript SDK for [Loopstack](https://loopstack.ai) — the same REST + SSE API that Studio and the CLI use, as a typed, framework-free client. Runs in bare Node and in the browser; the only dependency is the shared contracts package.

```bash
npm install @loopstack/client
```

## Start a run and stream it — in under 20 lines

Against a local backend with auth disabled, no token or login needed:

```js
import { createClient } from '@loopstack/client';

const client = createClient({ url: 'http://localhost:3000' });

const { data: workspaces } = await client.workspaces.list({ limit: 1 });
const workspace = workspaces[0] ?? (await client.workspaces.create({ appName: 'hello_app', title: 'SDK' }));

const events = client.stream.events(); // subscribe before starting — no event is missed
const run = await client.processor.start({ workflowName: 'hello', workspaceId: workspace.id, args: { name: 'SDK' } });

for await (const event of events) {
  if (!('workflowId' in event) || event.workflowId !== run.workflowId) continue;
  if (event.type === 'llm.response.text_delta') process.stdout.write(event.delta);
  if (event.type === 'workflow.updated' && ['completed', 'failed', 'canceled'].includes(event.status)) break;
}
client.stream.close();

const { result } = await client.workflows.get(run.workflowId);
console.log(result); // → { greeting: 'Hello, SDK! 👋' }
```

## Resources

Every backend slice is a typed resource on the client:

| Resource            | What it covers                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `client.workflows`  | Runs: `get`, `status`, `list` (filter/sort/search), `create`, `update`, `delete`, `checkpoints`                       |
| `client.documents`  | Documents produced by runs: `get`, `list`                                                                             |
| `client.processor`  | Execution: `start` a workflow, `run` a transition (answer prompts, resume)                                            |
| `client.workspaces` | Workspaces: CRUD, favourites, batch delete                                                                            |
| `client.config`     | What the backend serves: `apps` (workflows, documents, UI config), `tools`, `workflowSource`, `availableEnvironments` |
| `client.dashboard`  | `stats` — recent runs and errors                                                                                      |
| `client.auth`       | `me`, `workerHealth`, hub login/refresh/logout                                                                        |
| `client.http`       | The typed fetch layer (`get`/`post`/`put`/`patch`/`delete`) for anything not covered yet                              |

All request and response types come from `@loopstack/contracts` — the same zod-derived contracts the server validates against.

## Live events

`client.stream` is the backend's SSE event stream. It is lazy — no connection opens until the first subscriber:

```js
client.stream.on('workflow.updated', (event) => console.log(event.status));
const off = client.stream.onAny((event) => console.log(event.type));
for await (const event of client.stream.events()) {
  /* async-iterator form */
}
client.stream.close();
```

## Authentication

```js
const client = createClient({
  url: 'https://my-backend.example.com',
  token: process.env.LOOPSTACK_TOKEN, // personal access token (lsk_…) or JWT
});
```

Omit `token` for cookie-based sessions (browser) or local backends with auth disabled. Custom `fetch` and `credentials` can be injected for testing and instrumentation.

## Query descriptors

`client.queries.*` exposes every read as `{ queryKey, queryFn }` descriptors, cache-scoped by the client's `envKey` — plug them into any TanStack-Query-style cache, or use [`@loopstack/react`](https://www.npmjs.com/package/@loopstack/react) for ready-made hooks.

## Documentation

Full docs: [loopstack.ai/docs](https://loopstack.ai/docs) · SDK reference: [loopstack.ai/docs/reference/client](https://loopstack.ai/docs/reference/client) · Terminal client: [`@loopstack/cli`](https://www.npmjs.com/package/@loopstack/cli)
