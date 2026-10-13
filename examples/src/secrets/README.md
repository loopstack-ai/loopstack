---
title: Secrets Examples
description: Workflow examples for secrets management in Loopstack — deterministic request/verify flow and a chat agent using the get_secret_keys and request_secrets_task tools
---

# Secrets Examples

> Secrets workflow examples for the [Loopstack](https://loopstack.ai) automation framework.

Two ways to manage workspace secrets: a scripted request/verify flow, and a chat agent that decides when to ask the user for credentials.

## Use in Your App

Copy this directory into your app, then install what it imports:

```bash
npm install @loopstack/agent @loopstack/claude @loopstack/common @loopstack/secrets
```

Register the module:

```typescript
import { Module } from '@nestjs/common';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { SecretsExamplesModule } from './secrets/secrets-examples.module';

@Module({
  imports: [LoopstackModule.forRoot(), SecretsExamplesModule],
})
export class AppModule {}
```

## Required app-module configuration

The Agentic example launches `ChatAgentWorkflow` from `@loopstack/agent`, which calls the LLM through `@loopstack/llm-provider`. That module is `@Global` and must be configured once in your root module to set the default model:

```typescript
import { Module } from '@nestjs/common';
import { LlmProviderModule } from '@loopstack/llm-provider';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { SecretsExamplesModule } from './secrets/secrets-examples.module';

@Module({
  imports: [
    LoopstackModule.forRoot(),
    LlmProviderModule.forRoot({ model: 'claude-sonnet-4-6' }),
    SecretsExamplesModule,
  ],
})
export class AppModule {}
```

`SecretsExamplesModule` already imports `AgentModule` (the agent workflows), `ClaudeModule` (provider) and `SecretsModule.forFeature()` (entity + REST surface). `LlmProviderModule.forRoot(...)` sets the default model the agent uses. The Deterministic example doesn't call an LLM and works without it.

## Environment

The agentic example requires Claude credentials:

```bash
ANTHROPIC_API_KEY=sk-ant-...
```

## Examples

| Example                         | Studio title                      | Description                                                |
| ------------------------------- | --------------------------------- | ---------------------------------------------------------- |
| [Deterministic](#deterministic) | `Secrets - Deterministic Example` | Scripted request/verify flow — no LLM involved             |
| [Agentic](#agentic)             | `Secrets - Agentic Example`       | Chat agent that checks and requests secrets via tool calls |

---

## Deterministic

A scripted workflow that requests two secrets from the user, waits for them to be stored, then verifies they were saved. No LLM involved.

### What it demonstrates

- Persisting a `SecretRequestDocument` with the expected keys so the user sees the prompt in Studio
- A `wait: true` transition named `secretsSubmitted` (the transition the form fires) that resumes once the user submits the secrets
- Reading current key availability via `GetSecretKeysTool`

### Key code

```ts
@Transition({ to: 'requesting_secrets' })
async requestSecretsFromUser() {
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

Launches `ChatAgentWorkflow` with the `get_secret_keys` and `request_secrets_task` tools. The agent checks which secrets the workspace already has and asks the user for the missing ones through a secure form. The values go straight to storage; the LLM only ever sees the key names. The user can chat with the agent until it calls `agent_finish`, which ends the run with a one-sentence summary.

### What it demonstrates

- Giving an agent the secrets tools by name: `tools: ['get_secret_keys', 'request_secrets_task']`
- `request_secrets_task` as a task tool: it opens the `SecretsRequestWorkflow` form, and the agent continues once the user has submitted it
- `taskMode: true`, which offers the agent `agent_finish`; the agent's result arrives in the parent's `agentFinished` callback

### Key code

```ts
@Transition({ to: 'running' })
async start() {
  await this.chatAgentWorkflow.run(
    {
      system: this.render(join(__dirname, 'templates', 'system.md')),
      tools: ['get_secret_keys', 'request_secrets_task'],
      userMessage: this.render(join(__dirname, 'templates', 'userMessage.md')),
      taskMode: true,
    },
    { callback: { transition: 'agentFinished' }, show: 'inline', label: 'Secrets Agent' },
  );
}

@Transition({ from: 'running', to: 'end', wait: true, schema: SecretsSummarySchema })
async agentFinished(_state: Record<string, unknown>, input: TransitionInput<SecretsSummary>) {
  await this.documentStore.save(MessageDocument, { role: 'assistant', text: input.data.summary });
  this.setResult(input.data);
}
```

### Files

- `agentic-example.workflow.ts` — workflow class
- `templates/system.md` — system prompt, including how to call `agent_finish`
- `templates/userMessage.md` — the agent's first user message

## About

Author: [Jakob Klippel](https://www.linkedin.com/in/jakob-klippel/)

License: MIT
