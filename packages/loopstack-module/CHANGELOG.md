# @loopstack/loopstack-module

## 0.31.6

### Patch Changes

- [#238](https://github.com/loopstack-ai/loopstack/pull/238) [`70a0b9c`](https://github.com/loopstack-ai/loopstack/commit/70a0b9c5ad66eeb51b78b3c795ef3297182f1e40) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Harden the SSE event stream for reconnecting and headless clients: every frame carries a monotonic sequence `id`, events are kept in a per-user replay buffer (bounded by size and TTL), reconnects with `Last-Event-ID` (or `?lastEventId=`) replay the missed tail — or receive a `stream.reset` event when the cursor is stale — heartbeat `ping` frames let non-browser clients detect dead connections, and `?workflowId=` filters the stream to a single run. Tuning knobs (`bufferSize`, `bufferTtlMs`, `heartbeatIntervalMs`) are exposed via the `sse` option on `LoopstackApiModule.register()` and `LoopstackModule.forRoot()`; `GET /sse/health` reports buffer stats.

- Updated dependencies [[`70a0b9c`](https://github.com/loopstack-ai/loopstack/commit/70a0b9c5ad66eeb51b78b3c795ef3297182f1e40), [`0c032f3`](https://github.com/loopstack-ai/loopstack/commit/0c032f3cbf92ae29e849859f628d761c1dc956c7), [`2f48470`](https://github.com/loopstack-ai/loopstack/commit/2f48470ff10ecb1b07a877adacfc312a20b1e061), [`2f37cea`](https://github.com/loopstack-ai/loopstack/commit/2f37ceac3d13380b7e25ff5b8e57e11b0b598897), [`e67c62a`](https://github.com/loopstack-ai/loopstack/commit/e67c62aac7539e7d8c642d7f667327cb9d2aa91e), [`20970e9`](https://github.com/loopstack-ai/loopstack/commit/20970e90fee8bb9d72624928b45c73c65eb73f20), [`5568421`](https://github.com/loopstack-ai/loopstack/commit/5568421370aaf94ffda9ce3e1228b8b6c78aa845), [`7ca82a0`](https://github.com/loopstack-ai/loopstack/commit/7ca82a028ef47285b80b62ad78209cc6531d3f0d), [`dcb4d09`](https://github.com/loopstack-ai/loopstack/commit/dcb4d09f06a0185921f6787a93287396bd7de841), [`69e8a13`](https://github.com/loopstack-ai/loopstack/commit/69e8a131922392b77bdbb9b5e31e577f60b57479)]:
  - @loopstack/api@0.37.0
  - @loopstack/contracts@0.37.0
  - @loopstack/core@0.37.0
  - @loopstack/common@0.37.0
  - @loopstack/auth@0.37.0

## 0.31.5

### Patch Changes

- Updated dependencies [[`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89)]:
  - @loopstack/api@0.36.0
  - @loopstack/common@0.36.0
  - @loopstack/contracts@0.36.0
  - @loopstack/core@0.36.0
  - @loopstack/auth@0.36.0

## 0.31.4

### Patch Changes

- Updated dependencies [[`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c)]:
  - @loopstack/common@0.35.0
  - @loopstack/core@0.35.0
  - @loopstack/contracts@0.35.0
  - @loopstack/api@0.35.0
  - @loopstack/auth@0.35.0

## 0.31.3

### Patch Changes

- Updated dependencies [[`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c), [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c), [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c)]:
  - @loopstack/common@0.34.0
  - @loopstack/contracts@0.34.0
  - @loopstack/core@0.34.0
  - @loopstack/api@0.34.0
  - @loopstack/auth@0.34.0

## 0.31.2

### Patch Changes

- Updated dependencies [[`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b)]:
  - @loopstack/common@0.33.0
  - @loopstack/api@0.33.0
  - @loopstack/auth@0.33.0
  - @loopstack/core@0.33.0

## 0.31.1

### Patch Changes

- [#176](https://github.com/loopstack-ai/loopstack/pull/176) [`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Move framework dependencies (NestJS, rxjs, class-transformer, etc.) from dependencies to devDependencies + peerDependencies

- Updated dependencies [[`228d08b`](https://github.com/loopstack-ai/loopstack/commit/228d08b807915ecfa6ef8275714500750e797036), [`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8)]:
  - @loopstack/core@0.32.3
  - @loopstack/contracts@0.32.3
  - @loopstack/common@0.32.3
  - @loopstack/api@0.32.3
  - @loopstack/auth@0.32.3

## 0.31.0

### Minor Changes

- [#170](https://github.com/loopstack-ai/loopstack/pull/170) [`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - feat(framework): rework framework components and align with NestJs practices

### Patch Changes

- Updated dependencies [[`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c)]:
  - @loopstack/contracts@0.32.0
  - @loopstack/common@0.32.0
  - @loopstack/auth@0.32.0
  - @loopstack/core@0.32.0
  - @loopstack/api@0.32.0

## 0.30.2

### Patch Changes

- [#165](https://github.com/loopstack-ai/loopstack/pull/165) [`2b3d4ac`](https://github.com/loopstack-ai/loopstack/commit/2b3d4acd91ec6f262a05686d8dd8a31ce3caaef1) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Bundle docker-compose files with the npm package for simplified infrastructure setup

## 0.30.1

### Patch Changes

- Updated dependencies [[`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1)]:
  - @loopstack/contracts@0.31.0
  - @loopstack/common@0.31.0
  - @loopstack/core@0.31.0
  - @loopstack/api@0.31.0
  - @loopstack/auth@0.31.0

## 0.30.0

### Minor Changes

- [#147](https://github.com/loopstack-ai/loopstack/pull/147) [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Nodenext ts options

### Patch Changes

- [#147](https://github.com/loopstack-ai/loopstack/pull/147) [`a220472`](https://github.com/loopstack-ai/loopstack/commit/a220472529f50ac5957f960787f742bdf57ab511) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Rename isLocalMode config to enableAuth, fix block decorator metadata, and remove CLI module dependency

- Updated dependencies [[`6847dd4`](https://github.com/loopstack-ai/loopstack/commit/6847dd43d390b090388b2eddfc2ec50d8b4cc3c1), [`a220472`](https://github.com/loopstack-ai/loopstack/commit/a220472529f50ac5957f960787f742bdf57ab511), [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b)]:
  - @loopstack/core@0.30.0
  - @loopstack/auth@0.30.0
  - @loopstack/common@0.30.0
  - @loopstack/contracts@0.30.0
  - @loopstack/api@0.30.0
