---
title: Secrets Module
description: Workspace-scoped secrets storage for Loopstack workflows — SecretEntity, SecretService, SecretController REST API, GetSecretKeysTool (get_secret_keys), RequestSecretsTask (request_secrets_task), SecretsRequestWorkflow, SecretRequestDocument. CRUD service, upsert, request secrets from users at runtime.
---

# @loopstack/secrets

> Secrets management module for the [Loopstack](https://loopstack.ai) automation framework.

Provides workspace-scoped storage for API keys, tokens, and other credentials. Workflows can request secrets from users at runtime, store them securely, and check which secrets are available -- all without exposing values to the LLM.

## When to Use

- **Your workflow needs credentials at runtime** -- an API key, OAuth token, or webhook secret that isn't known until the user provides it.
- **You want to check whether secrets exist before branching** -- use `GetSecretKeysTool` to inspect available keys without reading values.
- **You need a secure input form in the Studio** -- `SecretRequestDocument` renders a form where users enter secrets that are stored server-side, never sent to the LLM. Scripted workflows save it themselves; agents call `RequestSecretsTask`.
- **You need CRUD access to secrets from backend code** -- inject `SecretService` directly for programmatic reads, writes, and upserts.

## Installation

```sh
npm install @loopstack/secrets
```

Register the module in your app module. `SecretsModule` registers `SecretEntity` with TypeORM via `forFeature` internally, so your root `TypeOrmModule.forRoot()` must include `SecretEntity` (or load entities via glob).

```ts
import { Module } from '@nestjs/common';
import { SecretsModule } from '@loopstack/secrets';

@Module({
  imports: [SecretsModule],
})
export class AppModule {}
```

Use `SecretsModule.forFeature()` to register with the feature registry (enables opt-in feature toggling):

```ts
@Module({
  imports: [SecretsModule.forFeature()],
})
export class AppModule {}
```

## Quick Start

Save a `SecretRequestDocument` to ask the user for secrets, wait for the submission, then use `GetSecretKeysTool` to verify they were stored:

```ts
import { BaseWorkflow, MarkdownDocument, Transition, Workflow } from '@loopstack/common';
import { GetSecretKeysTool, SecretRequestDocument } from '@loopstack/secrets';

interface SecretsState {
  secretKeys?: Array<{ key: string; hasValue: boolean }>;
}

@Workflow({
  title: 'Secrets Update Example',
  description: 'Requests secrets from the user and verifies they were stored.',
})
export class SecretsExampleWorkflow extends BaseWorkflow {
  constructor(private readonly getSecretKeys: GetSecretKeysTool) {
    super();
  }

  @Transition({ to: 'requesting_secrets' })
  async requestSecretsFromUser(state: SecretsState) {
    await this.documentStore.save(SecretRequestDocument, {
      variables: [{ key: 'EXAMPLE_API_KEY' }, { key: 'EXAMPLE_SECRET' }],
    });
  }

  @Transition({ from: 'requesting_secrets', to: 'verifying', wait: true })
  async secretsSubmitted(state: SecretsState) {
    const result = await this.getSecretKeys.call();
    this.assignState({ secretKeys: result.data });
  }

  @Transition({ from: 'verifying', to: 'end' })
  async showResult(state: SecretsState) {
    await this.documentStore.save(MarkdownDocument, {
      markdown: this.render(join(__dirname, 'templates', 'secretsVerified.md'), {
        secretKeys: state.secretKeys,
      }),
    });
  }
}
```

## How It Works

### Requesting secrets from a user

Saving a `SecretRequestDocument` renders the secure form in the Studio. The workflow pauses on a `wait: true` transition named `secretsSubmitted` -- the transition the form fires -- until the user submits it. Values are stored on `SecretEntity` and never returned to the LLM.

```
start ──> requesting_secrets ──(wait)──> verifying ──> end
           save                    user submits       check keys
           SecretRequestDocument   secrets             & continue
```

### Using RequestSecretsTask in agent workflows

`RequestSecretsTask` is the tool for agents. It launches `SecretsRequestWorkflow` as a sub-workflow with a callback (rendered inline in the parent's view via the default `show: 'inline'`), and resolves when the user completes the form. Use this when an LLM agent decides at runtime which secrets to request.

```ts
import { RequestSecretsTask, GetSecretKeysTool, SecretsRequestWorkflow } from '@loopstack/secrets';

// In the workflow constructor:
constructor(
  private readonly requestSecrets: RequestSecretsTask,
  private readonly getSecretKeys: GetSecretKeysTool,
  private readonly secretsRequest: SecretsRequestWorkflow,
) {
  super();
}

// Register tools with the LLM:
tools: ['get_secret_keys', 'request_secrets_task']
```

### Reading secrets in server-side code

Inject `SecretService` for direct CRUD access:

```ts
import { Injectable } from '@nestjs/common';
import { SecretService } from '@loopstack/secrets';

@Injectable()
export class MyService {
  constructor(private readonly secrets: SecretService) {}

  async getToken(workspaceId: string) {
    const all = await this.secrets.findAllByWorkspace(workspaceId);
    return all.find((s) => s.key === 'GITHUB_TOKEN')?.value;
  }
}
```

### REST API

`SecretController` exposes CRUD endpoints scoped to a workspace. The GET endpoint returns keys and `hasValue` flags only -- never the actual secret values.

| Method   | Endpoint                                         | Description           |
| -------- | ------------------------------------------------ | --------------------- |
| `GET`    | `/api/v1/workspaces/:workspaceId/secrets`        | List secret keys      |
| `POST`   | `/api/v1/workspaces/:workspaceId/secrets`        | Create a secret       |
| `PUT`    | `/api/v1/workspaces/:workspaceId/secrets/upsert` | Create or update      |
| `PUT`    | `/api/v1/workspaces/:workspaceId/secrets/:id`    | Update a secret by ID |
| `DELETE` | `/api/v1/workspaces/:workspaceId/secrets/:id`    | Delete a secret by ID |

## Tools Reference

### `get_secret_keys`

Returns the list of secret keys available in the current workspace. Does not return secret values.

| Arg  | Type | Required | Description           |
| ---- | ---- | -------- | --------------------- |
| none | --   | --       | No arguments required |

**Returns:** `Array<{ key: string; hasValue: boolean }>`

### `request_secrets_task`

Requests secret values from the user. Launches `SecretsRequestWorkflow` as a sub-workflow, displays an embedded link document, and completes via callback when the user submits secrets. Must be the only tool call in the response.

| Arg         | Type                     | Required | Description                                  |
| ----------- | ------------------------ | -------- | -------------------------------------------- |
| `variables` | `Array<{ key: string }>` | Yes      | List of secret keys to request from the user |

**Returns:** `{ workflowId: string }` (pending), then `"Secrets have been stored securely by the user."` (on completion)

## Configuration

`SecretsModule.forFeature()` accepts an optional config object:

```ts
SecretsModule.forFeature({ enabled: true });
```

| Option    | Type      | Default | Description                                   |
| --------- | --------- | ------- | --------------------------------------------- |
| `enabled` | `boolean` | --      | Opt-in feature toggle for the secrets feature |

## Public API

- **Module:** `SecretsModule`
- **Entity:** `SecretEntity`
- **Service:** `SecretService` -- `findAllByWorkspace`, `create`, `update`, `upsert`, `delete`
- **Controller:** `SecretController` -- REST CRUD under `/api/v1/workspaces/:workspaceId/secrets`
- **Tools:** `GetSecretKeysTool`, `RequestSecretsTask`
- **Workflow:** `SecretsRequestWorkflow`
- **Document:** `SecretRequestDocument`
- **Types:** `GetSecretKeysResult`, `RequestSecretsTaskResult`

## Dependencies

| Package             | Role                                |
| ------------------- | ----------------------------------- |
| `@loopstack/common` | Base classes, decorators, types     |
| `@loopstack/core`   | Framework runtime, WorkspaceService |
| `@nestjs/common`    | NestJS dependency injection         |
| `@nestjs/typeorm`   | TypeORM integration for NestJS      |
| `typeorm`           | Database ORM (SecretEntity)         |
| `zod`               | Tool input schema validation        |

## Related

- [Secrets Management docs](https://loopstack.ai/docs/build/integrations/secrets) -- overview of secret tools, how-it-works flow, and template examples
- [secrets-example-workflow](/docs/examples/secrets) -- example with both a direct workflow and an agent-based approach using `RequestSecretsTask`

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
