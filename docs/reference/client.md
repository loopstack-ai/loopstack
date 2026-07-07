---
title: TypeScript SDK (@loopstack/client)
description: The headless TypeScript SDK for Loopstack — createClient, typed resources (workflows, documents, processor, workspaces, config, dashboard, auth), the SSE event stream (stream.on, stream.events async iterator), token and cookie authentication, query descriptors for TanStack Query, and a complete bare-Node example that starts a workflow run and streams it to completion.
---

# TypeScript SDK

`@loopstack/client` is the headless SDK for Loopstack: the same REST + SSE API that Studio and the CLI use, as a typed, framework-free client. It runs in bare Node and in the browser, has no framework dependencies, and every request and response type comes from `@loopstack/contracts` — the same zod contracts the server validates against.

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

| Resource            | What it covers                                                                                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `client.workflows`  | Runs: `get`, `status`, `list` (filter/sort/search/pagination), `create`, `update`, `delete`, `batchDelete`, `checkpoints`                                        |
| `client.documents`  | Documents produced by runs: `get`, `list`                                                                                                                        |
| `client.processor`  | Execution: `start` a workflow, `run` a transition — answering human-in-the-loop prompts is a transition with a payload                                           |
| `client.workspaces` | Workspaces: CRUD, favourites, batch delete                                                                                                                       |
| `client.config`     | What the backend serves: `apps` (workflows, documents, UI config per `@StudioApp`), `tools`, `tool`, `workflowConfig`, `workflowSource`, `availableEnvironments` |
| `client.dashboard`  | `stats` — recent runs and recent errors                                                                                                                          |
| `client.auth`       | `me`, `workerHealth`, `hubLogin`, `refresh`, `logout`                                                                                                            |
| `client.http`       | The typed fetch layer (`get`/`post`/`put`/`patch`/`delete`) — the escape hatch for endpoints without a resource yet                                              |

## Live events

`client.stream` is the backend's server-sent-events stream, shared by all subscribers of the client. It is lazy — no connection opens until the first subscriber attaches:

```js
// Typed per-event-type handler; returns an unsubscribe function
client.stream.on('workflow.updated', (event) => console.log(event.workflowId, event.status));

// Every event
const off = client.stream.onAny((event) => console.log(event.type));

// Async-iterator form — ideal for following one run
for await (const event of client.stream.events()) {
  /* … */
}

client.stream.close();
```

Event types include `workflow.updated` (place and status changes), `document.*`, and `llm.response.*` (token deltas while an LLM generates).

## Authentication

```js
const client = createClient({
  url: 'https://my-backend.example.com',
  token: process.env.LOOPSTACK_TOKEN, // personal access token (lsk_…) or JWT
});
```

- **Token** — pass a personal access token (created via `POST /api/v1/auth/tokens` or Studio) or a JWT; it is sent as a bearer credential on every request and on the event stream.
- **Cookies** — omit `token` in the browser; `credentials` defaults to `'include'`.
- **Local development** — a backend with auth disabled needs neither.

`fetch` can be injected for testing or instrumentation.

## Query descriptors

Every read is also available as a `{ queryKey, queryFn }` descriptor under `client.queries.*`, with keys scoped by the client's `envKey` (defaults to the URL) so two environments never share cache entries. Plug them into any TanStack-Query-compatible cache — or use [`@loopstack/react`](/docs/reference/react) for ready-made hooks with live invalidation.
