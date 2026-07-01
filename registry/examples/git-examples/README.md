---
title: Git Examples
description: Git and GitHub workflow examples — scripted multi-tool git operations and end-to-end repo sync via ConnectGitHubWorkflow
---

# @loopstack/git-examples

> Git and GitHub workflow examples for the [Loopstack](https://loopstack.ai) automation framework.

Two workflow examples that show how to compose git tools and integrate with GitHub.

## Install as Source (Recommended)

```bash
npx giget@latest gh:loopstack-ai/loopstack/registry/examples/git-examples src/git-examples
```

Register the module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { GitExamplesModule } from './git-examples/git-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), GitExamplesModule],
})
export class AppModule {}
```

## Install as a Dependency

```bash
npm install @loopstack/git-examples
```

```typescript
import { GitExamplesModule } from '@loopstack/git-examples';
```

## Required app-module configuration

Both examples invoke git tools that execute on a **remote agent**, so the workspace needs a connected `sandbox` environment. `GitExamplesModule` declares the slot via `RemoteClientModule.forFeature(...)`, but the consumer must register at least one matching environment in their root module via `RemoteClientModule.forRoot(...)`:

```typescript
import { Module } from '@nestjs/common';
import { GitExamplesModule } from '@loopstack/git-examples';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { RemoteClientModule } from '@loopstack/remote-client';

@Module({
  imports: [
    LoopstackModule.forRoot(),
    RemoteClientModule.forRoot({
      environments: {
        available: [
          {
            type: 'sandbox',
            name: 'Local Remote Server',
            connectionUrl: process.env.SANDBOX_URL ?? 'http://localhost:3080',
            agentUrl: process.env.SANDBOX_AGENT_URL ?? 'http://localhost:3001',
            local: true,
          },
        ],
      },
    }),
    GitExamplesModule,
  ],
})
export class AppModule {}
```

The `type: 'sandbox'` must match the slot type declared by `GitExamplesModule`. The simplest remote agent option is `@loopstack/remote-server` on `localhost:3001`.

`GitExamplesModule` re-imports `GitModule.forFeature()` and `GitHubIntegrationModule`, which transitively brings in the global `OAuthModule` and the GitHub OAuth provider — no additional OAuth wiring required in your AppModule. You just need to set the GitHub OAuth client env vars (see [Environment](#environment) below).

## Environment

The repo-sync example requires GitHub OAuth credentials:

```bash
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

## Examples

| Example                               | Studio title                     | Description                                                            |
| ------------------------------------- | -------------------------------- | ---------------------------------------------------------------------- |
| [Git Commit Flow](#git-commit-flow)   | `Git - Commit Flow Example`      | Scripted multi-tool git workflow — status → add → commit → log, no LLM |
| [GitHub Repo Sync](#github-repo-sync) | `Git - GitHub Repo Sync Example` | Launches `ConnectGitHubWorkflow` for the full repo sync flow           |

---

## Git Commit Flow

A scripted workflow that orchestrates four git tools in sequence: `gitStatus`, `gitAdd`, `gitCommit`, `gitLog`. No LLM involved — demonstrates composing tools deterministically.

### Files

- `git-commit-flow-example.workflow.ts` — workflow class

## GitHub Repo Sync

Thin wrapper that launches `ConnectGitHubWorkflow` from `@loopstack/github-integration` as a sub-workflow. The integration handles the full sync flow: OAuth → create or pick repo → check uncommitted changes → resolve divergence → push.

### Files

- `github-repo-sync-example.workflow.ts` — workflow class

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
