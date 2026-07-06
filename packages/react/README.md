# @loopstack/react

React hooks for [Loopstack](https://loopstack.ai) — a thin [TanStack Query](https://tanstack.com/query) adapter over [`@loopstack/client`](https://www.npmjs.com/package/@loopstack/client). Your app owns the `QueryClient`; this package contributes typed query and mutation hooks plus live cache invalidation from the backend's event stream.

```bash
npm install @loopstack/react @loopstack/client @tanstack/react-query
```

## Setup

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

## Hooks

**Queries** (all support TanStack options incl. `select`, `enabled`):
`useWorkflow`, `useWorkflowStatus`, `useWorkflowList`, `useChildWorkflows`, `useWorkflowCheckpoints`, `useDocument`, `useWorkflowDocuments`, `useWorkspace`, `useWorkspaceList`, `useAppsConfig`, `useWorkflowConfig`, `useWorkflowSource`, `useToolConfigs`, `useToolConfig`, `useAvailableEnvironments`, `useDashboardStats`, `useMe`, `useWorkerHealth`

**Mutations** (invalidate or update the relevant caches on success):
`useStartWorkflow`, `useRunWorkflow`, `useCreateWorkflow`, `useUpdateWorkflow`, `useDeleteWorkflow`, `useCreateWorkspace`, `useUpdateWorkspace`, `useSetFavouriteWorkspace`, `useDeleteWorkspace`, `useBatchDeleteWorkspaces`, `useHubLogin`, `useRefreshSession`, `useLogout`

**Streaming:** `useLlmStream(workflowId)` accumulates live LLM tokens for a run; `useLoopstackClient()` returns the raw client for anything else.

## Multiple environments

Cache keys are scoped by the client's `envKey`, so several `LoopstackProvider`s (different backends) can safely share one `QueryClient`.

## Documentation

Full docs: [loopstack.ai/docs](https://loopstack.ai/docs) · Reference: [loopstack.ai/docs/reference/react](https://loopstack.ai/docs/reference/react)
