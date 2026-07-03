---
'@loopstack/react': minor
'@loopstack/client': patch
---

New `@loopstack/react` package — the React adapter over `@loopstack/client`: `LoopstackProvider` supplies a client per environment, thin TanStack Query hooks (`useWorkflow`, `useWorkflowStatus`, `useWorkflowList`, `useChildWorkflows`, `useWorkflowCheckpoints`, `useDocument`, `useWorkflowDocuments`) wrap the SDK's query descriptors, mutation hooks (`useStartWorkflow`, `useRunWorkflow`, `useCreateWorkflow`, `useUpdateWorkflow`, `useDeleteWorkflow`) invalidate the matching keys, `useLiveInvalidation()` binds the event stream to the host's QueryClient with a per-key trailing debounce and environment-scoped `stream.reset` handling, and `useLlmStream(workflowId)` accumulates LLM token deltas into per-message state. The client's `childWorkflows` query descriptor now lists children oldest-first with the same page size Studio uses.
