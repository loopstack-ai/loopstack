# Secrets Management

Loopstack provides built-in tools for requesting and retrieving secrets (API keys, tokens, etc.) from users at runtime.

## Overview

Secrets are requested from the user via `RequestSecretsTool` and stored securely. They can later be retrieved with `GetSecretKeysTool` to verify availability.

## Available Tools

| Tool                    | Source                      | Description                                              |
| ----------------------- | --------------------------- | -------------------------------------------------------- |
| `RequestSecretsTool`    | `@loopstack/secrets-module` | Request secrets from the user via a UI prompt            |
| `RequestSecretsTask`    | `@loopstack/secrets-module` | Agent-friendly task that launches a secrets sub-workflow |
| `GetSecretKeysTool`     | `@loopstack/secrets-module` | List stored secret keys and their availability           |
| `SecretRequestDocument` | `@loopstack/secrets-module` | Document displaying the secret input form                |

## Example Workflow

```typescript
import { BaseWorkflow, ToolResult, Transition, Workflow } from '@loopstack/common';
import { MarkdownDocument } from '@loopstack/common';
import { GetSecretKeysTool, RequestSecretsTool, SecretRequestDocument } from '@loopstack/secrets-module';

interface SecretsState {
  secretKeys?: Array<{ key: string; hasValue: boolean }>;
}

@Workflow({ widget: __dirname + '/secrets-example.ui.yaml' })
export class SecretsExampleWorkflow extends BaseWorkflow<Record<string, unknown>, SecretsState> {
  constructor(
    private readonly requestSecrets: RequestSecretsTool,
    private readonly getSecretKeys: GetSecretKeysTool,
  ) {
    super();
  }

  @Transition({ to: 'requesting_secrets' })
  async requestSecretsFromUser(state: SecretsState): Promise<SecretsState> {
    await this.requestSecrets.call({
      variables: [{ key: 'EXAMPLE_API_KEY' }, { key: 'EXAMPLE_SECRET' }],
    });

    await this.documentStore.save(SecretRequestDocument, {
      variables: [{ key: 'EXAMPLE_API_KEY' }, { key: 'EXAMPLE_SECRET' }],
    });
    return state;
  }

  @Transition({ from: 'requesting_secrets', to: 'verifying', wait: true })
  async secretsSubmitted(state: SecretsState): Promise<SecretsState> {
    const result: ToolResult<Array<{ key: string; hasValue: boolean }>> = await this.getSecretKeys.call({});
    return { ...state, secretKeys: result.data };
  }

  @Transition({ from: 'verifying', to: 'end' })
  async showResult(state: SecretsState): Promise<unknown> {
    await this.documentStore.save(MarkdownDocument, {
      markdown: this.render(__dirname + '/templates/secretsVerified.md', {
        secretKeys: state.secretKeys,
      }),
    });
    return {};
  }
}
```

## How It Works

1. **Request** — `RequestSecretsTool` tells the framework which secrets are needed
2. **Display** — `SecretRequestDocument` shows a secure input form in the UI
3. **Wait** — The workflow pauses (`wait: true`) until the user submits the secrets
4. **Verify** — `GetSecretKeysTool` checks which secrets are now stored
5. **Use** — Secrets are available as environment variables in subsequent tool calls

## Template Example

```markdown
# Secrets Verification

{{#each secretKeys}}

- **{{this.key}}**: {{#if this.hasValue}}Stored{{else}}Missing{{/if}}
  {{/each}}
```

## Registry References

- [secrets-example-workflow](https://loopstack.ai/registry/loopstack-secrets-example-workflow) — Request secrets from user, verify storage, and display results with both direct workflow and agent-based approaches
