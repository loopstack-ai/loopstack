---
'@loopstack/secrets-module': minor
---

Secret mutations return the full updated state (`{ id, key, hasValue }`) instead of `{ id, key }`, so clients see the truthful value state without waiting for the SSE round-trip. Request bodies are validated with zod (`SecretWriteSchema`, `SecretUpdateSchema`) — previously the ValidationPipe had no DTO classes and passed anything through. The schemas and `SecretItemInterface` are exported from the package.
