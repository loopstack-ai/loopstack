# @loopstack/scheduling-examples

## 0.1.3

### Patch Changes

- [#420](https://github.com/loopstack-ai/loopstack/pull/420) [`0c73301`](https://github.com/loopstack-ai/loopstack/commit/0c73301b72f7ff84fe622710543965d9e51f2855) Thanks [@jakobklippel](https://github.com/jakobklippel)! - `@nestjs/config` is a peer dependency (`^4.0.0 || ^12.0.0`), so every package injects the app's own `ConfigService`.
  A NestJS 11 app on `@nestjs/config` 4.x now boots with a single copy of `@nestjs/config`, the one its
  `ConfigModule.forRoot()` registers.
- Updated dependencies [[`3e27fd4`](https://github.com/loopstack-ai/loopstack/commit/3e27fd40a0e20fe2f97d37a7f8f73cb2cda1b193), [`8bc5176`](https://github.com/loopstack-ai/loopstack/commit/8bc5176a199b9272607a4fa5b2ddbd3f918bf51c), [`fc71cf0`](https://github.com/loopstack-ai/loopstack/commit/fc71cf018ff239527e8cfa251c73cd810cbd24bc), [`23347f3`](https://github.com/loopstack-ai/loopstack/commit/23347f394eb5a701f6af6bfb15af4bb81273e204), [`0c73301`](https://github.com/loopstack-ai/loopstack/commit/0c73301b72f7ff84fe622710543965d9e51f2855), [`7fbd978`](https://github.com/loopstack-ai/loopstack/commit/7fbd9781224568dc1d93fa007a905b8f5cea6700), [`469f01c`](https://github.com/loopstack-ai/loopstack/commit/469f01c6f4519504ae0ca5a18f881439a55824fc), [`033d585`](https://github.com/loopstack-ai/loopstack/commit/033d585a128494abfb568ba3e3d923a58f2e7c6d), [`e683f2e`](https://github.com/loopstack-ai/loopstack/commit/e683f2e77230c0f9b71735d78155042c6ea18d37), [`a6d9846`](https://github.com/loopstack-ai/loopstack/commit/a6d9846e8b2dc9634092fab97fb164b737a0fcb9)]:
  - @loopstack/common@0.44.0
  - @loopstack/core@0.44.0

## 0.1.2

### Patch Changes

- [#253](https://github.com/loopstack-ai/loopstack/pull/253) [`558d24e`](https://github.com/loopstack-ai/loopstack/commit/558d24eb39a9fd253a81c43ecbba249c1bfbe0c5) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Bump `@nestjs/*` dependencies to v12.

- Updated dependencies [[`558d24e`](https://github.com/loopstack-ai/loopstack/commit/558d24eb39a9fd253a81c43ecbba249c1bfbe0c5), [`300165b`](https://github.com/loopstack-ai/loopstack/commit/300165b5f158c916d07da9ada867cdeb69111aab)]:
  - @loopstack/core@0.41.0
  - @loopstack/common@0.41.0

## 0.1.1

### Patch Changes

- [#238](https://github.com/loopstack-ai/loopstack/pull/238) [`338ca4c`](https://github.com/loopstack-ai/loopstack/commit/338ca4ceabcb4746077e3496f4ea7a7425a29387) Thanks [@jakobklippel](https://github.com/jakobklippel)! - READMEs gain the standard installation section (install command, verified module import, required env keys) — the registry-wide convention that replaces a `loopstack add` installer.

- Updated dependencies [[`2f37cea`](https://github.com/loopstack-ai/loopstack/commit/2f37ceac3d13380b7e25ff5b8e57e11b0b598897), [`e67c62a`](https://github.com/loopstack-ai/loopstack/commit/e67c62aac7539e7d8c642d7f667327cb9d2aa91e), [`20970e9`](https://github.com/loopstack-ai/loopstack/commit/20970e90fee8bb9d72624928b45c73c65eb73f20), [`5568421`](https://github.com/loopstack-ai/loopstack/commit/5568421370aaf94ffda9ce3e1228b8b6c78aa845), [`7ca82a0`](https://github.com/loopstack-ai/loopstack/commit/7ca82a028ef47285b80b62ad78209cc6531d3f0d), [`dcb4d09`](https://github.com/loopstack-ai/loopstack/commit/dcb4d09f06a0185921f6787a93287396bd7de841)]:
  - @loopstack/core@0.37.0
  - @loopstack/common@0.37.0
