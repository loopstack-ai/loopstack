# @loopstack/secrets-example-workflow

Demonstrates two secrets flows: a deterministic request/verify workflow and an agentic workflow where the LLM requests and validates secrets using secrets tools.

## By using this example you'll get...

- `SecretsExampleWorkflow` for a simple request-and-verify flow
- `SecretsAgentExampleWorkflow` that loops with tool calling (`get_secret_keys`, `request_secrets_task`)
- UI documents showing secret requests and verification status

## Installation

```sh
npm install @loopstack/secrets-example-workflow
```

This example depends on `@loopstack/secrets-module` and `@loopstack/claude-module`; configure secrets storage and Claude credentials before running.

## How It Works

### Deterministic flow (`SecretsExampleWorkflow`)

1. Calls `RequestSecretsTool` and saves a `SecretRequestDocument`.
2. Waits for user-provided secrets.
3. Calls `GetSecretKeysTool` to read key availability.
4. Renders verification output via `MarkdownDocument`.

### Agentic flow (`SecretsAgentExampleWorkflow`)

1. Seeds hidden/system context for the LLM.
2. Runs LLM turns with Claude and allowed secrets tools.
3. Delegates tool calls and merges callback results.
4. Loops until end-turn, while supporting follow-up user messages.

## Public API

- `SecretsExampleModule`
- `SecretsExampleWorkflow`
- `SecretsAgentExampleWorkflow`

## Dependencies

- `@loopstack/common`, `@loopstack/core`
- `@loopstack/secrets-module`
- `@loopstack/llm-provider-module`
- `@loopstack/claude-module`
