# @loopstack/remote-client

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

HTTP client and workflow tools for talking to a Loopstack remote server — the sandboxed process that owns a workspace's filesystem and shell. This is the foundation most other feature modules (git, code-agent, file-explorer) build on.

## Overview

A Loopstack workspace runs inside a remote server (e.g. a container, a VM, or a local process) that exposes an HTTP API for file operations, shell commands, and environment management. `RemoteClient` is the typed client for that API, and this module also bundles 10 workflow tools that let any workflow read files, edit them, run `bash`, and so on — all against the remote workspace, not the host process.

By using this module you'll get:

- **`RemoteClient`** service — typed HTTP client for the remote server
- **`SandboxEnvironmentService`** — resolves the remote agent URL for the current workflow context
- **`EnvironmentController`** — REST endpoints for env/workspace management
- **10 workflow tools**: `ReadTool`, `WriteTool`, `EditTool`, `BashTool`, `GlobTool`, `GrepTool`, `RebuildAppTool`, `ResetWorkspaceTool`, `LogsTool`, `SyncSecretsTool`

## Installation

```sh
npm install @loopstack/remote-client
```

Register the module:

```ts
import { RemoteClientModule } from '@loopstack/remote-client';

@Module({
  imports: [RemoteClientModule /* ... */],
})
export class AppModule {}
```

`RemoteClientModule` depends on `SecretsModule` (for `SyncSecretsTool`), `LoopCoreModule`, and uses `WorkspaceEntity` via TypeORM.

## How It Works

### Using the file-operation tools from a workflow

```ts
import { BaseWorkflow, InjectTool, Transition, Workflow } from '@loopstack/common';
import { BashTool, EditTool, ReadTool } from '@loopstack/remote-client';

@Workflow({ uiConfig: __dirname + '/my.ui.yaml' })
export class MyWorkflow extends BaseWorkflow {
  @InjectTool() read: ReadTool;
  @InjectTool() edit: EditTool;
  @InjectTool() bash: BashTool;

  @Transition({ from: 'ready', to: 'done' })
  async rewritePackageJson() {
    const { data } = await this.read.call({ path: 'package.json' });
    await this.edit.call({
      path: 'package.json',
      oldString: '"version": "0.1.0"',
      newString: '"version": "0.2.0"',
    });
    await this.bash.call({ command: 'npm install' });
  }
}
```

Every tool resolves the remote agent URL from the workflow context, so you don't pass it in yourself.

### Using `RemoteClient` directly

Inject it into any service to call the remote server without going through a tool:

```ts
import { RemoteClient, SandboxEnvironmentService } from '@loopstack/remote-client';

@Injectable()
export class MyService {
  constructor(
    private readonly client: RemoteClient,
    private readonly sandbox: SandboxEnvironmentService,
  ) {}

  async listFiles(ctx: unknown, path: string) {
    const url = this.sandbox.getAgentUrl(ctx);
    return this.client.glob(url, { pattern: `${path}/**/*` });
  }
}
```

## Public API

- **Module:** `RemoteClientModule`
- **Services:** `RemoteClient`, `SandboxEnvironmentService`
- **Controller:** `EnvironmentController`
- **Tools:** `ReadTool`, `WriteTool`, `EditTool`, `BashTool`, `GlobTool`, `GrepTool`, `RebuildAppTool`, `ResetWorkspaceTool`, `LogsTool`, `SyncSecretsTool`

## Dependencies

- `@loopstack/common`, `@loopstack/core` — framework
- `@loopstack/secrets-module` — consumed by `SyncSecretsTool`
- `@nestjs/typeorm`, `typeorm` — workspace persistence

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- Find more Loopstack modules in the [Loopstack Registry](https://loopstack.ai/registry)
