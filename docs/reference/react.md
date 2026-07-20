---
title: React Hooks (@loopstack/react)
description: React adapter for the Loopstack SDK — LoopstackProvider, TanStack Query hooks (useWorkflow, useWorkflowList, useWorkflowDocuments, useWorkspaceList, useAppsConfig, useDashboardStats, useMe and more), mutations (useStartWorkflow, useRunWorkflow, workspace CRUD), useLiveInvalidation for SSE-driven cache refresh, and useLlmStream for live LLM token streaming.
---

# React Hooks

`@loopstack/react` connects a [`@loopstack/client`](/docs/reference/client) to React through [TanStack Query](https://tanstack.com/query): typed query and mutation hooks, live cache invalidation from the backend's event stream, and LLM token streaming. It is deliberately thin — your app owns the `QueryClient`, styling, and routing; the package contributes data access only.

```bash
npm install @loopstack/react @loopstack/client @tanstack/react-query
```

## Setup

Mount a `LoopstackProvider` inside your `QueryClientProvider` and enable live invalidation once:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createClient } from '@loopstack/client';
import { LoopstackProvider, useLiveInvalidation } from '@loopstack/react';

const queryClient = new QueryClient();
const client = createClient({ url: 'http://localhost:3000' });

function Live({ children }) {
  useLiveInvalidation(); // SSE events → targeted query invalidation
  return children;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LoopstackProvider client={client}>
        <Live>
          <RunList />
        </Live>
      </LoopstackProvider>
    </QueryClientProvider>
  );
}
```

```tsx
import { useStartWorkflow, useWorkflowList } from '@loopstack/react';

function RunList() {
  const { data } = useWorkflowList({ limit: 10 });
  const start = useStartWorkflow();

  return (
    <>
      <button onClick={() => start.mutate({ workflowName: 'hello', workspaceId: '…', args: { name: 'React' } })}>
        Run hello
      </button>
      <ul>
        {data?.data.map((run) => (
          <li key={run.id}>
            {run.workflowName} — {run.status}
          </li>
        ))}
      </ul>
    </>
  );
}
```

With `useLiveInvalidation` mounted, the list refreshes itself as runs progress — no polling.

## Query hooks

All query hooks wrap the SDK's query descriptors and accept TanStack options (`select`, `enabled`, `refetchInterval`, …) with full type inference:

- **Runs** — `useWorkflow(id)`, `useWorkflowStatus(id)`, `useWorkflowList(params)`, `useChildWorkflows(parentId)`, `useWorkflowCheckpoints(id)`
- **Documents** — `useDocument(id)`, `useWorkflowDocuments(workflowId, params)`
- **Workspaces** — `useWorkspace(id)`, `useWorkspaceList(params)`
- **Config** — `useAppsConfig()`, `useWorkflowConfig(name)`, `useWorkflowSource(name)`, `useToolConfigs()`, `useToolConfig(name)`, `useAvailableEnvironments()`
- **Dashboard & auth** — `useDashboardStats()`, `useMe()`, `useWorkerHealth()`

## Mutations

Mutations invalidate — or, where the API returns the fresh state, directly update — the affected caches:

- **Execution** — `useStartWorkflow()`, `useRunWorkflow()` (transitions, incl. answering human-in-the-loop prompts)
- **Runs** — `useCreateWorkflow()`, `useUpdateWorkflow()`, `useDeleteWorkflow()`
- **Workspaces** — `useCreateWorkspace()`, `useUpdateWorkspace()`, `useSetFavouriteWorkspace()`, `useDeleteWorkspace()`, `useBatchDeleteWorkspaces()`
- **Session** — `useHubLogin()`, `useRefreshSession()`, `useLogout()`

## Streaming and the raw client

- `useLlmStream(workflowId)` — accumulates live LLM token deltas for a run (Studio uses it for the streaming answer view).
- `useLoopstackClient()` — the nearest provided `LoopstackClient`, for anything the hooks don't cover.

## Multiple environments

Cache keys are scoped by each client's `envKey`, so several `LoopstackProvider`s pointing at different backends can safely share a single `QueryClient` — Studio embedded next to your own data fetching, for example.
