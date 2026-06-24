---
title: Secrets Examples
description: Workflow examples for secrets management in Loopstack — deterministic request/verify flow and an agentic LLM flow using get_secret_keys and request_secrets_task tools
---

# @loopstack/secrets-examples

> Secrets workflow examples for the [Loopstack](https://loopstack.ai) automation framework.

Two ways to manage workspace secrets: a scripted request/verify flow, and an agent loop where the LLM decides when to ask the user for credentials.

## Install as Source (Recommended)

Examples are meant to be read, copied, and adapted. Pull the source straight into your project with [giget](https://github.com/unjs/giget):

```bash
npx giget@latest gh:loopstack-ai/loopstack/registry/examples/secrets-examples src/secrets-examples
```

After copying, register the module in your app:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { SecretsExamplesModule } from './secrets-examples/secrets-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), SecretsExamplesModule],
})
export class AppModule {}
```

## Install as a Dependency

```bash
npm install @loopstack/secrets-examples
```

```typescript
import { SecretsExamplesModule } from '@loopstack/secrets-examples';
```

## Environment

The agentic example requires Claude credentials:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

## Examples

| Example                         | Studio title                      | Description                                                          |
| ------------------------------- | --------------------------------- | -------------------------------------------------------------------- |
| [Deterministic](#deterministic) | `Secrets - Deterministic Example` | Scripted request/verify flow — no LLM involved                       |
| [Agentic](#agentic)             | `Secrets - Agentic Example`       | LLM agent that checks, requests, and verifies secrets via tool calls |

---

## Deterministic

A scripted workflow that requests two secrets from the user, waits for them to be stored, then verifies they were saved. No LLM involved.

### What it demonstrates

- Calling `RequestSecretsTool` with a list of expected keys
- Persisting a `SecretRequestDocument` so the user sees the prompt in Studio
- A `wait: true` transition that resumes once the user submits the secrets
- Reading current key availability via `GetSecretKeysTool`

### Key code

```ts
@Transition({ to: 'requesting_secrets' })
async requestSecretsFromUser() {
  await this.requestSecrets.call({
    variables: [{ key: 'EXAMPLE_API_KEY' }, { key: 'EXAMPLE_SECRET' }],
  });
  await this.documentStore.save(SecretRequestDocument, {
    variables: [{ key: 'EXAMPLE_API_KEY' }, { key: 'EXAMPLE_SECRET' }],
  });
}

@Transition({ from: 'requesting_secrets', to: 'verifying', wait: true })
async secretsSubmitted() {
  const result = await this.getSecretKeys.call();
  this.assignState({ secretKeys: result.data });
}
```

### Files

- `deterministic-example.workflow.ts` — workflow class
- `templates/secretsVerified.md` — Handlebars summary template

## Agentic

An agent workflow where the LLM decides when to check for existing secrets and when to request new ones. The user can also send follow-up messages mid-loop.

### What it demonstrates

- Configuring an LLM call with allowed tools via `config: { tools: ['get_secret_keys', 'request_secrets_task'] }`
- A delegate/tool-result loop using `LlmDelegateToolCallsTool` + `LlmUpdateToolResultTool`
- Guard-based routing on `stopReason === 'tool_use'` vs end-of-turn
- A `prompt-input` widget that lets the user inject messages while the agent runs

### Key code

```ts
@Transition({ from: 'ready', to: 'prompt_executed' })
async llmTurn() {
  const result = await this.llmGenerateText.call(
    {},
    {
      config: {
        provider: 'claude',
        model: 'claude-haiku-4-5-20251001',
        tools: ['get_secret_keys', 'request_secrets_task'],
        system: this.render(join(__dirname, 'templates', 'system.md')),
      },
    },
  );
  this.assignState({ llmResult: result.data });
}

@Transition({ from: 'prompt_executed', to: 'awaiting_tools', priority: 10 })
@Guard('hasToolCalls')
async executeToolCalls(state) {
  const result = await this.llmDelegateToolCalls.call({
    message: state.llmResult!.message,
    callback: { transition: 'toolResultReceived' },
  });
  this.assignState({ delegateResult: result.data });
}
```

### Files

- `agentic-example.workflow.ts` — workflow class
- `agentic-example.ui.yaml` — `prompt-input` widget for follow-up messages
- `templates/system.md` — system prompt
- `templates/systemMessage.md` — initial user/context message

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
