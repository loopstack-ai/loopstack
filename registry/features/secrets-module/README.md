# @loopstack/secrets-module

> A module for the [Loopstack AI](https://loopstack.ai) automation framework.

Secrets storage for Loopstack workspaces. Provides a TypeORM-backed entity, a service, REST endpoints, and workflow tools for requesting and retrieving workspace-scoped secrets (API keys, tokens, etc.).

## Overview

Many workflows need credentials — a GitHub token, an OpenAI key, a webhook secret — and most of those credentials are user-specific. This module provides the full stack for managing them: a database entity, a service for CRUD, a REST controller for a UI, and workflow tools that let a workflow ask the user for missing secrets and then read them back.

By using this module you'll get:

- **`SecretEntity`** — TypeORM entity (per-workspace key/value pairs)
- **`SecretService`** — `findAllByWorkspace`, `create`, `update`, `upsert`, `delete`
- **`SecretController`** — REST CRUD under `/secrets`
- **`GetSecretKeysTool`** — returns the list of secret keys available in the current workspace (no values)
- **`RequestSecretsTool`** — launches `SecretsRequestWorkflow` to ask the user for one or more secrets
- **`RequestSecretsTask`** — task-style variant of `RequestSecretsTool`
- **`SecretsRequestWorkflow`** — the workflow that renders a form and saves the answers
- **`SecretRequestDocument`** — the document type rendered in the Studio while the workflow waits

## Installation

```sh
npm install @loopstack/secrets-module
```

Register the module:

```ts
import { SecretsModule } from '@loopstack/secrets-module';

@Module({
  imports: [SecretsModule /* ... */],
})
export class AppModule {}
```

`SecretsModule` uses `SecretEntity` via TypeORM — make sure your root `TypeOrmModule.forRoot` includes the `SecretEntity` (or loads entities via glob).

## How It Works

### Asking a workflow for credentials

Inject `RequestSecretsTool` and list the keys you need. The tool pauses the workflow until the user provides values; once they do, it stores them on `SecretEntity` and the workflow resumes:

```ts
import { BaseWorkflow, InjectTool, Transition, Workflow } from '@loopstack/common';
import { RequestSecretsTool } from '@loopstack/secrets-module';

@Workflow({ uiConfig: __dirname + '/my.ui.yaml' })
export class MyWorkflow extends BaseWorkflow {
  @InjectTool() requestSecrets: RequestSecretsTool;

  @Transition({ from: 'ready', to: 'authenticated' })
  async collectToken() {
    await this.requestSecrets.call({
      keys: ['GITHUB_TOKEN'],
      message: 'Paste a GitHub personal access token with `repo` scope.',
    });
  }
}
```

### Reading secrets in server-side code

Inject `SecretService` and query by workspace id:

```ts
import { SecretService } from '@loopstack/secrets-module';

@Injectable()
export class MyService {
  constructor(private readonly secrets: SecretService) {}

  async getToken(workspaceId: string) {
    const all = await this.secrets.findAllByWorkspace(workspaceId);
    return all.find((s) => s.key === 'GITHUB_TOKEN')?.value;
  }
}
```

### Checking which secrets exist without exposing values

`GetSecretKeysTool` returns only keys — useful when a workflow wants to branch on "do we already have this secret?" without reading the value.

## Public API

- **Module:** `SecretsModule`
- **Entity:** `SecretEntity`
- **Service:** `SecretService`
- **Controller:** `SecretController` (REST CRUD under `/secrets`)
- **Tools:** `GetSecretKeysTool`, `RequestSecretsTool`, `RequestSecretsTask`
- **Workflow:** `SecretsRequestWorkflow`
- **Document:** `SecretRequestDocument`

## Dependencies

- `@loopstack/common`, `@loopstack/core` — framework
- `@nestjs/typeorm`, `typeorm` — persistence
- `@nestjs/swagger` — OpenAPI decorators on the controller
- `zod` — tool input schemas

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT

### Additional Resources

- [Loopstack Documentation](https://loopstack.ai/docs)
- Find more Loopstack modules in the [Loopstack Registry](https://loopstack.ai/registry)
