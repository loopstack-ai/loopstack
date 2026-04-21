# Generic Agent Workflow — Concept Document

## Goal

Create a reusable, concrete `AgentWorkflow` class at `loopstack/registry/features/agent-module/` that encapsulates the standard LLM agent loop. Configured via `run()` args, follows the standard `@Workflow` pattern — no abstract classes, no inheritance.

## Agent Workflow

### Args

```typescript
z.object({
  system: z.string(), // system prompt
  tools: z.array(z.string()), // tool property names (resolved from workflow, then workspace)
  userMessage: z.string(), // initial user message
  model: z.string().optional(), // default: 'claude-sonnet-4-6'
  cache: z.boolean().optional(), // default: true
});
```

### State Machine

```
start ──[setup]──→ ready
ready ──[llmTurn]──→ prompt_executed
prompt_executed ──[executeToolCalls]──→ awaiting_tools       (priority:10, guard: hasToolCalls)
prompt_executed ──[respond]──→ end                           (Final, guard: isEndTurn)
awaiting_tools ──[toolResultReceived]──→ awaiting_tools      (wait:true)
awaiting_tools ──[toolsComplete]──→ ready                    (guard: allToolsComplete)
awaiting_tools ──[cancelPendingTools]──→ ready               (wait:true)
```

### Completion

The agent exits when the LLM responds with `end_turn` (no more tool calls). The Final transition extracts text from the last LLM response and returns it as the workflow result. The system prompt instructs the LLM to include its final answer in the last message.

### Cancel

A "Cancel pending tools" button is shown at `awaiting_tools`. Cancels all pending child workflows via `orchestrator.cancelChildren()` and loops back to `ready`.

### Customization

For interactive/conversational agents or custom exit logic: copy the workflow and modify directly. The generic agent is a closed-loop that runs until the LLM decides it's done.

### Consumer Usage

```typescript
// In a workspace:
@Workspace({ ... })
export class DefaultWorkspace implements WorkspaceInterface {
  @InjectWorkflow() agent: AgentWorkflow;

  // Tools available to all workflows (including AgentWorkflow) in this workspace
  @InjectTool() glob: GlobTool;
  @InjectTool() grep: GrepTool;
  @InjectTool() read: ReadTool;
}

// In a parent workflow:
@InjectWorkflow() agent: AgentWorkflow;

await this.agent.run({
  system: 'You are a code exploration agent. Summarize your findings in your final message.',
  tools: ['glob', 'grep', 'read'],
  userMessage: 'Find all API endpoints',
}, { alias: 'agent', callback: { transition: 'agentCallback' } });
```

The agent does not have `@InjectTool() glob` itself. It resolves `glob` from the workspace at runtime.

### Package Structure

```
loopstack/registry/features/agent-module/
├── src/
│   ├── index.ts
│   ├── agent.module.ts
│   ├── workflows/
│   │   ├── index.ts
│   │   ├── agent.workflow.ts
│   │   └── agent.ui.yaml
│   └── types/
│       ├── index.ts
│       └── agent.types.ts
├── package.json, tsconfig.json, tsconfig.build.json, nest-cli.json
```

---

## Framework Change: Workspace Tool Resolution

### Problem

`DelegateToolCalls` and `ClaudeToolsHelperService` resolve tools via `getBlockTool(this.ctx.parent, name)` where `this.ctx.parent` is the current workflow instance. If a tool is not declared via `@InjectTool()` on the workflow, resolution fails. The generic `AgentWorkflow` doesn't know which domain tools to inject.

### Solution

Allow `@InjectTool()` on workspaces. Extend tool resolution to fall back from workflow to workspace.

**Resolution order:**

1. `getBlockTool(workflow, name)` — current workflow's `@InjectTool()` (existing behavior, takes priority)
2. `getBlockTool(workspace, name)` — workspace's `@InjectTool()` (new fallback)

### State Isolation

Tool state is stored per-execution in `StateManager` via `AsyncLocalStorage`, not on the proxy instance. Each workflow execution gets a fresh `StateManager` with empty `tools` state. Even if two executions use the same proxied tool singleton, their state is fully isolated. A tool with the same property name on both workflow and workspace does not cause conflicts — workflow-level resolution takes priority, so only one is ever used per execution.

---

## Implementation

### 1. Add workspace instance to execution context

**`packages/common/src/dtos/run-context.ts`**

- Add `workspaceInstance?: WorkspaceInterface`

**`packages/common/src/interfaces/execution-context.interface.ts`**

- Add `readonly workspace?: WorkspaceInterface` to `FrameworkContext`

**`packages/core/src/workflow-processor/workflow-processor.module.ts`**

- Add `get workspace()` to the `FRAMEWORK_CONTEXT` factory, reading from `ExecutionScope`

### 2. Resolve and pass workspace instance during execution

**`packages/core/src/workflow-processor/services/root-processor.service.ts`**

- In `runWorkflow()`: resolve the workspace NestJS singleton instance via `BlockDiscoveryService.getWorkspace(workflow.workspace.className)` and set it on `RunContext.workspaceInstance`
- The workspace entity is already loaded on `workflow.workspace`. `BlockDiscoveryService.getWorkspace()` already resolves the NestJS singleton by class name.

### 3. Unify tool proxying for workflows and workspaces

**`packages/core/src/workflow-processor/services/processors/workflow-processor.service.ts`**

Extract a shared `wireTools(target)` method and call it for both:

```typescript
private wireTools(target: object): void {
  const toolNames = getBlockTools(target);
  for (const name of toolNames) {
    const tool = (target as Record<string, unknown>)[name] as object | undefined;
    if (tool) {
      const proxy = this.toolExecutionService.wireAndProxyTool(tool, name);
      (target as Record<string, unknown>)[name] = proxy;
    }
  }
}

private wireFrameworkServices(workflow: WorkflowInterface, workspace?: WorkspaceInterface): void {
  this.wireTools(workflow);
  if (workspace) {
    this.wireTools(workspace);
  }
}
```

`wireAndProxyTool` is idempotent (WeakSet). The proxy captures `executionScope` by reference and accesses it at `call()` time. Workspace tools get the same schema validation, interceptors, and state isolation as workflow tools.

### 4. Add workspace fallback to tool resolution

**`registry/features/claude-module/src/tools/delegate-tool-calls.tool.ts`**

In `executeTool()`:

```typescript
let tool = getBlockTool<BaseTool>(this.ctx.parent, block.name);
if (!tool && this.ctx.workspace) {
  tool = getBlockTool<BaseTool>(this.ctx.workspace, block.name);
}
```

**`registry/features/claude-module/src/services/claude-tools-helper.service.ts`**

Same fallback pattern for tool schema resolution. The method signature needs access to the workspace — either passed as parameter or accessed via an injected context.

### 5. Create agent-module package

Standard feature package with `AgentWorkflow`, `AgentModule`, and exports. See package structure above.

---

## Files Summary

### Files to modify

- `packages/common/src/dtos/run-context.ts` — add `workspaceInstance`
- `packages/common/src/interfaces/execution-context.interface.ts` — add `workspace` to `FrameworkContext`
- `packages/core/src/workflow-processor/workflow-processor.module.ts` — expose workspace in `FRAMEWORK_CONTEXT`
- `packages/core/src/workflow-processor/services/root-processor.service.ts` — resolve and pass workspace instance
- `packages/core/src/workflow-processor/services/processors/workflow-processor.service.ts` — extract `wireTools()`, wire workspace tools
- `registry/features/claude-module/src/tools/delegate-tool-calls.tool.ts` — workspace fallback in `executeTool()`
- `registry/features/claude-module/src/services/claude-tools-helper.service.ts` — workspace fallback in `getTools()`

### Files to create

- `registry/features/agent-module/package.json`
- `registry/features/agent-module/tsconfig.json`
- `registry/features/agent-module/tsconfig.build.json`
- `registry/features/agent-module/nest-cli.json`
- `registry/features/agent-module/src/index.ts`
- `registry/features/agent-module/src/agent.module.ts`
- `registry/features/agent-module/src/workflows/index.ts`
- `registry/features/agent-module/src/workflows/agent.workflow.ts`
- `registry/features/agent-module/src/workflows/agent.ui.yaml`
- `registry/features/agent-module/src/types/index.ts`
- `registry/features/agent-module/src/types/agent.types.ts`
- `registry/features/agent-module/README.md`

### Documentation to add/update

- `platform/website/src/content/features/` — add `agent-workflows.mdx` covering the agent module, workspace tool resolution, and how to build custom agents
- `platform/services/app-builder/src/assets/docs/features/` — add `agent-workflows.md` (same content, markdown format for the app-builder context docs that LLM agents use)
