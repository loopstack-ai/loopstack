---
"@loopstack/core": minor
"@loopstack/auth": minor
"@loopstack/api": minor
"@loopstack/loopstack-module": minor
"@loopstack/testing": minor
---

Ship the framework's runtime stack as `dependencies` instead of `peerDependencies`.

The NestJS integration modules and libraries that each package imports and
configures internally — `@nestjs/config`, `@nestjs/event-emitter`,
`@nestjs/bullmq`, `@nestjs/schedule`, `bullmq` (core); `@nestjs/jwt`,
`@nestjs/microservices`, `@nestjs/passport` (auth); `@nestjs/typeorm`, `pg`,
`typeorm` (loopstack-module); `@nestjs/config`, `@nestjs/typeorm` (testing) — are
now regular pinned `dependencies`. Only host-owned singletons that must be a
single shared instance (`@nestjs/common`, `@nestjs/core`,
`@nestjs/platform-express`, `reflect-metadata`, `rxjs`, `zod`,
`class-transformer`, `class-validator`) remain `peerDependencies`.

This makes a fresh install resolve the complete runtime without
`--legacy-peer-deps` and pins `typeorm` to the compatible `^0.3` range.
