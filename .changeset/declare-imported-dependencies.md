---
'@loopstack/common': patch
'@loopstack/core': patch
'@loopstack/api': patch
'@loopstack/auth': patch
'@loopstack/testing': patch
'@loopstack/google-workspace-module': patch
'@loopstack/github-module': patch
'@loopstack/oauth-module': patch
'@loopstack/openai-module': patch
'@loopstack/llm-provider-module': patch
'@loopstack/remote-client': patch
'@loopstack/code-agent': patch
'@loopstack/git-examples': patch
---

Every package declares the packages its code imports, so it loads under installs that don't hoist dependencies
(npm `--install-strategy=nested`, pnpm `hoist=false`, Yarn PnP).

- `@loopstack/common`: peer dependencies `@nestjs/common` and `typeorm`.
- `@loopstack/core`: depends on `@loopstack/contracts`; peer dependencies `typeorm`, `@nestjs/typeorm` and
  `reflect-metadata`.
- `@loopstack/api`: peer dependencies `typeorm`, `@nestjs/typeorm` and `zod`.
- `@loopstack/auth`: peer dependencies `typeorm` and `@nestjs/typeorm`.
- `@loopstack/testing`: peer dependency `typeorm`.
- `@loopstack/google-workspace-module`: depends on `@loopstack/common`; peer dependency `@nestjs/common`.
- `@loopstack/github-module`: peer dependency `@nestjs/common`.
- `@loopstack/oauth-module`, `@loopstack/openai-module`, `@loopstack/llm-provider-module`: peer dependency
  `@nestjs/common`.
- `@loopstack/remote-client`: peer dependencies `@nestjs/core`, `class-transformer` and `class-validator`.
- `@loopstack/code-agent`: depends on `@loopstack/llm-provider-module`, whose types its module config uses.
- `@loopstack/git-examples`: depends on `@loopstack/remote-client`.
