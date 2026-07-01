---
title: API: @loopstack/secrets-module
description: Public API reference for @loopstack/secrets-module
includeInLlmsFullTxt: false
---

# API: @loopstack/secrets-module

## Classes

### GetSecretKeysTool

Tool that returns the secret keys available in the current workspace without exposing their values.

```ts
import { GetSecretKeysTool } from '@loopstack/secrets-module';
```

**Provided by:** `SecretsModule`

```ts
export class GetSecretKeysTool extends BaseTool<object, object, GetSecretKeysResult> {
  protected handle(_args: object | undefined, ctx: RunContext): Promise<ToolEnvelope<GetSecretKeysResult>>;
}
```

### RequestSecretsTask

Tool that requests secrets from the user by launching `SecretsRequestWorkflow` as a callback-driven
sub-workflow; the agent-friendly variant of `request_secrets` for use inside agent loops.

```ts
import { RequestSecretsTask } from '@loopstack/secrets-module';
```

**Provided by:** `SecretsModule`

```ts
export class RequestSecretsTask extends BaseTool<RequestSecretsTaskInput, object, RequestSecretsTaskResult> {
  constructor(secretsRequestWorkflow: SecretsRequestWorkflow);
  protected handle(
    args: RequestSecretsTaskInput,
    ctx: RunContext,
    options?: ToolCallOptions,
  ): Promise<ToolEnvelope<RequestSecretsTaskResult>>;
  complete(_result: Record<string, unknown>): Promise<ToolEnvelope<RequestSecretsTaskResult>>;
}
```

### RequestSecretsTool

Tool that asks the user for secret values through a secure Studio form; values are stored server-side
and only the key names are returned, never the secrets themselves.

```ts
import { RequestSecretsTool } from '@loopstack/secrets-module';
```

**Provided by:** `SecretsModule`

```ts
export class RequestSecretsTool extends BaseTool<RequestSecretsInput, object, RequestSecretsResult> {
  protected handle(args: RequestSecretsInput): Promise<ToolEnvelope<RequestSecretsResult>>;
}
```

### SecretRequestDocument

Document that renders the secrets request form in Studio, listing the secret keys the user is asked
to provide values for.

```ts
import { SecretRequestDocument } from '@loopstack/secrets-module';
```

```ts
export class SecretRequestDocument {
  variables?: {
    key: string;
    value?: string;
  }[];
}
```

### SecretService

Service that performs workspace-scoped CRUD on secrets — find, create, update, upsert, and delete;
inject it to read or write secret values programmatically from backend code.

```ts
import { SecretService } from '@loopstack/secrets-module';
```

**Provided by:** `SecretsModule`

```ts
export class SecretService {
  constructor(secretRepository: Repository<SecretEntity>);
  findAllByWorkspace(workspaceId: string): Promise<SecretEntity[]>;
  create(
    workspaceId: string,
    data: {
      key: string;
      value: string;
    },
  ): Promise<SecretEntity>;
  update(
    id: string,
    workspaceId: string,
    data: {
      value?: string;
    },
  ): Promise<SecretEntity>;
  upsert(
    workspaceId: string,
    data: {
      key: string;
      value: string;
    },
  ): Promise<SecretEntity>;
  delete(id: string, workspaceId: string): Promise<void>;
}
```

### SecretsModule

NestJS module that provides workspace-scoped secrets storage — the `SecretEntity`, `SecretService`,
`SecretController` REST API, the `get_secret_keys` / `request_secrets` / `request_secrets_task` tools,
`SecretsRequestWorkflow`, and `SecretRequestDocument`.

Registration:

- `SecretsModule` — bare import registers the entity, controller, services, tools, and workflow; use
  this when you do not need feature-registry toggling.
- `SecretsModule.forFeature({ enabled?: boolean })` — use when you want the secrets capability registered
  with the feature registry so it can be opt-in toggled via the `enabled` flag.

Requires: a configured database — your root `TypeOrmModule.forRoot()` must include `SecretEntity` (the
module registers it via `TypeOrmModule.forFeature` internally, but the connection and schema must exist).

```ts
import { SecretsModule } from '@loopstack/secrets-module';
```

```ts
export class SecretsModule {
  static forFeature(config?: { enabled?: boolean }): DynamicModule;
}
```

### SecretsRequestWorkflow

Workflow that presents a secrets request form to the user and waits for submission, completing once
the user has entered and stored the requested secret values.

```ts
import { SecretsRequestWorkflow } from '@loopstack/secrets-module';
```

**Provided by:** `SecretsModule`

```ts
export class SecretsRequestWorkflow extends BaseWorkflow<SecretsRequestArgs> {
  showForm(state: SecretsRequestState, ctx: RunContext<SecretsRequestArgs>): Promise<void>;
  secretsSubmitted(_state: SecretsRequestState): void;
}
```

## Type Aliases

### GetSecretKeysResult

Result for `get_secret_keys` — one entry per secret with its `key` and a `hasValue` flag, never the value.

```ts
import { GetSecretKeysResult } from '@loopstack/secrets-module';
```

```ts
export type GetSecretKeysResult = {
  key: string;
  hasValue: boolean;
}[];
```

### RequestSecretsResult

Result for `request_secrets` — the list of requested secret keys after the user submits the form.

```ts
import { RequestSecretsResult } from '@loopstack/secrets-module';
```

```ts
export type RequestSecretsResult = {
  variables: {
    key: string;
  }[];
};
```

### RequestSecretsTaskResult

Result for `request_secrets_task` — the launched sub-workflow's id while pending, or a confirmation
string once the user has stored the secrets.

```ts
import { RequestSecretsTaskResult } from '@loopstack/secrets-module';
```

```ts
export type RequestSecretsTaskResult =
  | {
      workflowId: string;
    }
  | string;
```

## Variables

### SecretRequestDocumentSchema

Zod schema for the secrets request form document — a list of variables, each with a `key` and an
optional `value`.

```ts
import { SecretRequestDocumentSchema } from '@loopstack/secrets-module';
```

```ts
SecretRequestDocumentSchema: z.ZodObject<
  {
    variables: z.ZodOptional<
      z.ZodArray<
        z.ZodObject<
          {
            key: z.ZodString;
            value: z.ZodOptional<z.ZodString>;
          },
          z.core.$strip
        >
      >
    >;
  },
  z.core.$strict
>;
```
