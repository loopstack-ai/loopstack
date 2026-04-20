# @loopstack/git-module

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

Git version control for Loopstack workspaces. Exposes the common git operations as workflow tools plus a REST controller, all running against a workspace's remote agent.

## Overview

The Git module wraps a workspace's git repository with a consistent set of Loopstack tools, so workflows can stage, commit, branch, and push without shelling out manually. Every tool is a thin wrapper around `RemoteClient` — the underlying `git` command runs on the remote agent, not on the host running the workflow.

By using this module you'll get:

- **12 git tools** usable from any workflow via `@InjectTool()`: `GitStatusTool`, `GitAddTool`, `GitCommitTool`, `GitPushTool`, `GitPullTool`, `GitLogTool`, `GitDiffTool`, `GitFetchTool`, `GitCheckoutTool`, `GitBranchTool`, `GitRemoteConfigureTool`, `GitConfigUserTool`
- **`GitController`** — REST endpoints for calling the same operations from a UI

## Installation

```sh
npm install @loopstack/git-module
```

Register the module:

```ts
import { GitModule } from '@loopstack/git-module';

@Module({
  imports: [GitModule /* ... */],
})
export class AppModule {}
```

`GitModule` depends on `RemoteClientModule` and `LoopCoreModule`, and uses `WorkspaceEntity` via TypeORM — those need to be wired up in your app's root module (typically done in the scaffold).

## How It Works

### Using a git tool from a workflow

```ts
import { BaseWorkflow, InjectTool, Transition, Workflow } from '@loopstack/common';
import { GitAddTool, GitCommitTool, GitStatusTool } from '@loopstack/git-module';

@Workflow({ uiConfig: __dirname + '/commit.ui.yaml' })
export class CommitWorkflow extends BaseWorkflow {
  @InjectTool() gitStatus: GitStatusTool;
  @InjectTool() gitAdd: GitAddTool;
  @InjectTool() gitCommit: GitCommitTool;

  @Transition({ from: 'ready', to: 'done' })
  async commitAll() {
    await this.gitStatus.call({});
    await this.gitAdd.call({ paths: ['.'] });
    await this.gitCommit.call({ message: 'update from workflow' });
  }
}
```

Each tool's input schema is a Zod object — inspect any tool file under `src/tools/` to see the exact shape. For example, `GitCommitTool` takes `{ message: string }`; `GitAddTool` takes a list of paths.

### Routing tools at a specific workspace

Tools resolve the remote agent URL from the current workflow context (`this.ctx.context`). The corresponding `WorkspaceEntity` is what ties a workflow run to a specific git repository on a specific agent.

### REST endpoints

`GitController` exposes the same operations as HTTP endpoints under `/git/*`. Use these when you need a UI (e.g. the Loopstack Studio's diff viewer) to trigger git actions without starting a workflow.

## Public API

- **Module:** `GitModule`
- **Controller:** `GitController` (REST endpoints under `/git/*`)
- **Tools:** `GitStatusTool`, `GitAddTool`, `GitCommitTool`, `GitPushTool`, `GitPullTool`, `GitLogTool`, `GitDiffTool`, `GitFetchTool`, `GitCheckoutTool`, `GitBranchTool`, `GitRemoteConfigureTool`, `GitConfigUserTool`

## Dependencies

- `@loopstack/common` — `BaseTool`, `WorkspaceEntity`, decorators
- `@loopstack/core` — `LoopCoreModule`
- `@loopstack/remote-client` — `RemoteClient`, `SandboxEnvironmentService` (every tool dispatches through these)
- `@nestjs/typeorm`, `typeorm` — workspace persistence

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- Find more Loopstack modules in the [Loopstack Registry](https://loopstack.ai/registry)
