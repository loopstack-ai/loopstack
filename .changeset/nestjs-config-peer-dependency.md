---
'@loopstack/core': patch
'@loopstack/api': patch
'@loopstack/auth': patch
'@loopstack/testing': patch
'@loopstack/loopstack-module': patch
'@loopstack/github-module': patch
'@loopstack/google-workspace-module': patch
'@loopstack/scheduling-examples': patch
---

`@nestjs/config` is a peer dependency (`^4.0.0 || ^12.0.0`), so every package injects the app's own `ConfigService`.
A NestJS 11 app on `@nestjs/config` 4.x now boots with a single copy of `@nestjs/config`, the one its
`ConfigModule.forRoot()` registers.
