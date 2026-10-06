---
title: 'API: @loopstack/typesafe-module'
description: 'Public API reference for @loopstack/typesafe-module'
includeInLlmsFullTxt: false
---

# API: @loopstack/typesafe-module

## Classes

### TypeSafeClientService

Creates TypeSafe SDK clients with the API key read from the environment.

Inject it to call `systemOne()` directly when you want answer types inferred from your own question literals.

```ts
import { TypeSafeClientService } from '@loopstack/typesafe-module';
```

**Provided by:** `TypeSafeModule`

```ts
export class TypeSafeClientService {
  getClient(config?: TypeSafeModelConfig): TypeSafeClient;
  systemOne<const Q extends Questions>(
    request: SystemOneRequest<Q>,
    options?: { envApiKey?: string; signal?: AbortSignal },
  ): Promise<SystemOneResult<Q>>;
}
```

### TypeSafeModule

NestJS module that provides the `TypeSafeSystemOneTool` (`typesafe_system_one`) and the `TypeSafeClientService`
for typed yes/no, choice and score decisions with TypeSafe AI.

Registration:

- `TypeSafeModule` — bare import is all that is needed; there are no static methods.

Requires: a TypeSafe API key, read from the `TYPESAFE_API_KEY` env var by default (override the env var name per
call via `envApiKey`). The model defaults to `TYPESAFE_DEFAULT_MODEL`, then `jev-latest`.

```ts
import { TypeSafeModule } from '@loopstack/typesafe-module';
```

```ts
export class TypeSafeModule {}
```

### TypeSafeSystemOneTool

Tool that answers named yes/no (`noul`), `choice` and `score` questions about a state with TypeSafe AI.

Build questions with the `noul`, `choice` and `score` helpers exported by this package. The model and API key
env var come from `options.config`. Returns `TypeSafeSystemOneResult` with the answers keyed by question
name, and `TypeSafeResultMeta` with the model and token usage.

```ts
import { TypeSafeSystemOneTool } from '@loopstack/typesafe-module';
```

**Provided by:** `TypeSafeModule`

```ts
export class TypeSafeSystemOneTool extends BaseTool<
  TypeSafeSystemOneArgs,
  TypeSafeSystemOneConfig,
  TypeSafeSystemOneResult,
  TypeSafeResultMeta
> {
  protected handle(
    args: TypeSafeSystemOneArgs,
    ctx: RunContext,
    options?: ToolCallOptions<TypeSafeSystemOneConfig>,
  ): Promise<ToolEnvelope<TypeSafeSystemOneResult, TypeSafeResultMeta>>;
}
```

## Interfaces

### TypeSafeModelConfig

Per-call client settings for `TypeSafeClientService`.

```ts
import { TypeSafeModelConfig } from '@loopstack/typesafe-module';
```

```ts
export interface TypeSafeModelConfig {
  /** Model name (e.g. 'jev-latest'). Falls back to the SDK default: TYPESAFE_DEFAULT_MODEL, then 'jev-latest'. */
  model?: string;
  /** Environment variable name containing the API key. Falls back to TYPESAFE_API_KEY. */
  envApiKey?: string;
}
```

## Type Aliases

### TypeSafeAnswer

A TypeSafe answer (`noul`, `choice` or `score`).

```ts
import { TypeSafeAnswer } from '@loopstack/typesafe-module';
```

```ts
export type TypeSafeAnswer = z.infer<typeof TypeSafeAnswerSchema>;
```

### TypeSafeQuestion

A TypeSafe question (`noul`, `choice` or `score`).

```ts
import { TypeSafeQuestion } from '@loopstack/typesafe-module';
```

```ts
export type TypeSafeQuestion = z.infer<typeof TypeSafeQuestionSchema>;
```

### TypeSafeResultMeta

Metadata returned by `typesafe_system_one`: provider `typesafe`, the model that answered, and token usage.

```ts
import { TypeSafeResultMeta } from '@loopstack/typesafe-module';
```

```ts
export type TypeSafeResultMeta = {
  provider: 'typesafe';
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
};
```

### TypeSafeSystemOneArgs

Args for `TypeSafeSystemOneTool`.

```ts
import { TypeSafeSystemOneArgs } from '@loopstack/typesafe-module';
```

```ts
export type TypeSafeSystemOneArgs = z.infer<typeof TypeSafeSystemOneArgsSchema>;
```

### TypeSafeSystemOneConfig

Config for `TypeSafeSystemOneTool`.

```ts
import { TypeSafeSystemOneConfig } from '@loopstack/typesafe-module';
```

```ts
export type TypeSafeSystemOneConfig = z.infer<typeof TypeSafeSystemOneConfigSchema>;
```

### TypeSafeSystemOneResult

Result of the `typesafe_system_one` tool.

```ts
import { TypeSafeSystemOneResult } from '@loopstack/typesafe-module';
```

```ts
export type TypeSafeSystemOneResult = z.infer<typeof TypeSafeSystemOneResultSchema>;
```

## Variables

### TypeSafeAnswerSchema

Zod schema for any TypeSafe answer, discriminated by `type`: `TypeSafeNoulAnswerSchema`,
`TypeSafeChoiceAnswerSchema` or `TypeSafeScoreAnswerSchema`.

```ts
import { TypeSafeAnswerSchema } from '@loopstack/typesafe-module';
```

### TypeSafeChoiceAnswerSchema

Zod schema for a choice answer: the selected label, its confidence and the probability of every label.

```ts
import { TypeSafeChoiceAnswerSchema } from '@loopstack/typesafe-module';
```

### TypeSafeChoiceQuestionSchema

Zod schema for a question that selects one of the labels in `criteria` (`choice`).

```ts
import { TypeSafeChoiceQuestionSchema } from '@loopstack/typesafe-module';
```

### TypeSafeEntrySchema

Text, a JSON object or array, or `null` — the shape TypeSafe accepts for state, instructions and criteria.

```ts
import { TypeSafeEntrySchema } from '@loopstack/typesafe-module';
```

### TypeSafeNoulAnswerSchema

Zod schema for a yes/no answer: the probability of yes.

```ts
import { TypeSafeNoulAnswerSchema } from '@loopstack/typesafe-module';
```

### TypeSafeNoulQuestionSchema

Zod schema for a yes/no question (`noul`).

```ts
import { TypeSafeNoulQuestionSchema } from '@loopstack/typesafe-module';
```

### TypeSafeQuestionSchema

Zod schema for any TypeSafe question, discriminated by `type`: `TypeSafeNoulQuestionSchema`,
`TypeSafeChoiceQuestionSchema` or `TypeSafeScoreQuestionSchema`.

```ts
import { TypeSafeQuestionSchema } from '@loopstack/typesafe-module';
```

### TypeSafeScoreAnswerSchema

Zod schema for a score answer: the expected score (may fall between levels), its confidence, the rubric and the
probability of every level.

```ts
import { TypeSafeScoreAnswerSchema } from '@loopstack/typesafe-module';
```

### TypeSafeScoreQuestionSchema

Zod schema for a question that scores against an ordered rubric of at least two levels (`score`).

```ts
import { TypeSafeScoreQuestionSchema } from '@loopstack/typesafe-module';
```

### TypeSafeSystemOneArgsSchema

Zod schema for `typesafe_system_one` tool args: the `state` to evaluate and the named `questions` to answer.

```ts
import { TypeSafeSystemOneArgsSchema } from '@loopstack/typesafe-module';
```

### TypeSafeSystemOneConfigSchema

Zod schema for `typesafe_system_one` tool config (`model`, `envApiKey`).

```ts
import { TypeSafeSystemOneConfigSchema } from '@loopstack/typesafe-module';
```

```ts
TypeSafeSystemOneConfigSchema: z.ZodObject<
  {
    model: z.ZodOptional<z.ZodString>;
    envApiKey: z.ZodOptional<z.ZodString>;
  },
  z.core.$strip
>;
```

### TypeSafeSystemOneResultSchema

Zod schema for the `typesafe_system_one` result: the model that answered, the answers keyed by question name,
and token usage as reported by the API.

```ts
import { TypeSafeSystemOneResultSchema } from '@loopstack/typesafe-module';
```

## Re-exports from `@typesafe-ai/sdk`

The question builders `choice`, `noul` and `score`; the types `Questions`, `SystemOneRequest` and
`SystemOneResult`; and the error classes `TypeSafeError`, `APIError`, `APIConnectionError`, `APITimeoutError`,
`APIUserAbortError`, `AuthenticationError`, `BadRequestError`, `InternalServerError`, `NotFoundError`,
`PermissionDeniedError`, `RateLimitError` and `UnprocessableEntityError`.
