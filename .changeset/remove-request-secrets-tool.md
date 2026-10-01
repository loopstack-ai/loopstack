---
'@loopstack/secrets-module': minor
---

Remove `RequestSecretsTool` (`request_secrets`), `RequestSecretsResult` and `RequestSecretsResultSchema`.

To ask for secrets from a scripted workflow, save a `SecretRequestDocument` with the keys and add a `wait: true`
transition named `secretsSubmitted`, the transition the form fires. In an agent loop, offer the LLM
`request_secrets_task` (`RequestSecretsTask`). It shows the form, waits for the user and completes by callback.
