---
"@loopstack/agent": minor
"@loopstack/api": minor
"@loopstack/auth": minor
"@loopstack/claude-module": minor
"@loopstack/claude-tools-module": minor
"@loopstack/code-agent": minor
"@loopstack/git-module": minor
"@loopstack/github-integration": minor
"@loopstack/hitl": minor
"@loopstack/llm-provider-module": minor
"@loopstack/local-file-explorer-module": minor
"@loopstack/loopstack-module": minor
"@loopstack/mcp-module": minor
"@loopstack/quota": minor
"@loopstack/remote-file-explorer-module": minor
"@loopstack/sandbox-filesystem": minor
"@loopstack/sandbox-tool": minor
"@loopstack/secrets-module": minor
"@loopstack/testing": minor
"@loopstack/web-module": minor
---

Add NestJS 12 support. `@nestjs/common` / `@nestjs/core` / `@nestjs/platform-express` peer ranges are widened to `^11.0.0 || ^12.0.0`, and the first-party `@nestjs/*` dependencies (config, event-emitter, bullmq, schedule, typeorm, jwt, passport, microservices, testing) are bumped to their 12.x lines; `nest-commander` is bumped to `^3.21.0` for Nest 12 compatibility. Existing NestJS 11 applications continue to work unchanged.
