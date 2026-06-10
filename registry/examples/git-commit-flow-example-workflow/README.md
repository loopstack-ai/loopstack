---
title: Git Commit Flow Example
description: Example of scripted multi-tool orchestration using git-module — GitStatusTool, GitAddTool, GitCommitTool, GitLogTool in sequence, no LLM
---

# @loopstack/git-commit-flow-example-workflow

Demonstrates a scripted multi-tool orchestration using [`@loopstack/git-module`](https://loopstack.ai/docs/registry/features/git-module). The workflow stages everything, commits with a canned message, and captures the resulting commit from `git log` — the full happy path of a commit flow, no LLM involved.

## By using this example you'll get...

- A workflow that calls `GitStatusTool`, `GitAddTool`, `GitCommitTool`, and `GitLogTool` in sequence
- A pattern for direct tool injection and invocation (as opposed to agent-driven tool use)
- `MessageDocument` entries showing the state and final commit hash

## Installation

```sh
npm install @loopstack/git-commit-flow-example-workflow
```

`@loopstack/git-module` requires `@loopstack/remote-client` to be configured (sandbox environment with a git workspace).

Then register the module in your app:

```typescript
import { StudioApp } from '@loopstack/common';
import { GitCommitFlowExampleModule, GitCommitFlowExampleWorkflow } from '@loopstack/git-commit-flow-example-workflow';

@StudioApp({
  title: 'Git Commit Flow Example',
  workflows: [GitCommitFlowExampleWorkflow],
})
@Module({
  imports: [GitCommitFlowExampleModule],
})
export class MyAppModule {}
```

## How It Works

1. `git status` — capture the current dirty state.
2. `git add ["."]` — stage everything.
3. `git commit` — commit with a canned message.
4. `git log --limit 1` — read back the new commit hash and save it as a message.

## Public API

- `GitCommitFlowExampleModule`
- `GitCommitFlowExampleWorkflow`

## Dependencies

- `@loopstack/common`
- `@loopstack/git-module`
