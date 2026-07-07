# @loopstack/react

## 1.0.1

### Patch Changes

- [#240](https://github.com/loopstack-ai/loopstack/pull/240) [`e5f90da`](https://github.com/loopstack-ai/loopstack/commit/e5f90da6412b4cf15bc91c0d47d7e93c6e49c78d) Thanks [@jakobklippel](https://github.com/jakobklippel)! - npm-facing READMEs: a verified under-20-line quickstart (start a run, stream it, read the result), the resource/hook surface, auth, live events, and multi-environment cache scoping.

- Updated dependencies [[`e5f90da`](https://github.com/loopstack-ai/loopstack/commit/e5f90da6412b4cf15bc91c0d47d7e93c6e49c78d)]:
  - @loopstack/client@0.37.1

## 1.0.0

### Minor Changes

- [#238](https://github.com/loopstack-ai/loopstack/pull/238) [`5568421`](https://github.com/loopstack-ai/loopstack/commit/5568421370aaf94ffda9ce3e1228b8b6c78aa845) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Config and dashboard hooks: `useAppsConfig`, `useWorkflowConfig`, `useWorkflowSource`, `useToolConfigs`, `useToolConfig`, `useAvailableEnvironments`, and `useDashboardStats`.

- [#238](https://github.com/loopstack-ai/loopstack/pull/238) [`fcd617f`](https://github.com/loopstack-ai/loopstack/commit/fcd617ffb4af881c4352437cecf91b250ff5904b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - New `@loopstack/react` package — the React adapter over `@loopstack/client`: `LoopstackProvider` supplies a client per environment, thin TanStack Query hooks (`useWorkflow`, `useWorkflowStatus`, `useWorkflowList`, `useChildWorkflows`, `useWorkflowCheckpoints`, `useDocument`, `useWorkflowDocuments`) wrap the SDK's query descriptors, mutation hooks (`useStartWorkflow`, `useRunWorkflow`, `useCreateWorkflow`, `useUpdateWorkflow`, `useDeleteWorkflow`) invalidate the matching keys, `useLiveInvalidation()` binds the event stream to the host's QueryClient with a per-key trailing debounce and environment-scoped `stream.reset` handling, and `useLlmStream(workflowId)` accumulates LLM token deltas into per-message state. The client's `childWorkflows` query descriptor now lists children oldest-first with the same page size Studio uses.

- [#238](https://github.com/loopstack-ai/loopstack/pull/238) [`0c032f3`](https://github.com/loopstack-ai/loopstack/commit/0c032f3cbf92ae29e849859f628d761c1dc956c7) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Workspace hooks: `useWorkspace` and `useWorkspaceList` queries plus `useCreateWorkspace`, `useUpdateWorkspace`, `useSetFavouriteWorkspace`, `useDeleteWorkspace`, and `useBatchDeleteWorkspaces` mutations with SDK-key invalidation.

- [#238](https://github.com/loopstack-ai/loopstack/pull/238) [`e67c62a`](https://github.com/loopstack-ai/loopstack/commit/e67c62aac7539e7d8c642d7f667327cb9d2aa91e) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Auth hooks: `useMe` (no retries by default so 401s surface fast), `useWorkerHealth`, plus `useHubLogin`, `useRefreshSession`, and `useLogout` mutations that keep the me/health caches fresh.

### Patch Changes

- Updated dependencies [[`0c032f3`](https://github.com/loopstack-ai/loopstack/commit/0c032f3cbf92ae29e849859f628d761c1dc956c7), [`2f48470`](https://github.com/loopstack-ai/loopstack/commit/2f48470ff10ecb1b07a877adacfc312a20b1e061), [`2f37cea`](https://github.com/loopstack-ai/loopstack/commit/2f37ceac3d13380b7e25ff5b8e57e11b0b598897), [`e67c62a`](https://github.com/loopstack-ai/loopstack/commit/e67c62aac7539e7d8c642d7f667327cb9d2aa91e), [`fcd617f`](https://github.com/loopstack-ai/loopstack/commit/fcd617ffb4af881c4352437cecf91b250ff5904b), [`20970e9`](https://github.com/loopstack-ai/loopstack/commit/20970e90fee8bb9d72624928b45c73c65eb73f20), [`5568421`](https://github.com/loopstack-ai/loopstack/commit/5568421370aaf94ffda9ce3e1228b8b6c78aa845), [`7ca82a0`](https://github.com/loopstack-ai/loopstack/commit/7ca82a028ef47285b80b62ad78209cc6531d3f0d), [`dcb4d09`](https://github.com/loopstack-ai/loopstack/commit/dcb4d09f06a0185921f6787a93287396bd7de841), [`69e8a13`](https://github.com/loopstack-ai/loopstack/commit/69e8a131922392b77bdbb9b5e31e577f60b57479), [`c89852c`](https://github.com/loopstack-ai/loopstack/commit/c89852cb10298489f69307b3cacdea31ec02894c)]:
  - @loopstack/contracts@0.37.0
  - @loopstack/client@0.37.0
