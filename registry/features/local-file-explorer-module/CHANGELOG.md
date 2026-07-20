# @loopstack/local-file-explorer-module

## 0.25.1

### Patch Changes

- Updated dependencies [[`0c032f3`](https://github.com/loopstack-ai/loopstack/commit/0c032f3cbf92ae29e849859f628d761c1dc956c7), [`2f48470`](https://github.com/loopstack-ai/loopstack/commit/2f48470ff10ecb1b07a877adacfc312a20b1e061), [`2f37cea`](https://github.com/loopstack-ai/loopstack/commit/2f37ceac3d13380b7e25ff5b8e57e11b0b598897), [`e67c62a`](https://github.com/loopstack-ai/loopstack/commit/e67c62aac7539e7d8c642d7f667327cb9d2aa91e), [`20970e9`](https://github.com/loopstack-ai/loopstack/commit/20970e90fee8bb9d72624928b45c73c65eb73f20), [`5568421`](https://github.com/loopstack-ai/loopstack/commit/5568421370aaf94ffda9ce3e1228b8b6c78aa845), [`7ca82a0`](https://github.com/loopstack-ai/loopstack/commit/7ca82a028ef47285b80b62ad78209cc6531d3f0d), [`dcb4d09`](https://github.com/loopstack-ai/loopstack/commit/dcb4d09f06a0185921f6787a93287396bd7de841), [`69e8a13`](https://github.com/loopstack-ai/loopstack/commit/69e8a131922392b77bdbb9b5e31e577f60b57479)]:
  - @loopstack/contracts@0.37.0
  - @loopstack/core@0.37.0
  - @loopstack/common@0.37.0

## 0.25.0

### Minor Changes

- [#228](https://github.com/loopstack-ai/loopstack/pull/228) [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Split the single `fileExplorer` Studio feature into two independent features: `localFileExplorer` (workspace project files via `LocalFileExplorerModule`) and `remoteFileExplorer` (remote agent files via `RemoteFileExplorerModule`). Both can be enabled side-by-side and now show distinct sidebar panels ("Files" and "Remote Files").

  **URL changes (breaking):**
  - `LocalFileExplorerController`: `/api/v1/workspaces/:workspaceId/files/*` → `/api/v1/workspaces/:workspaceId/local-files/*`
  - `RemoteFileExplorerController`: `/api/v1/workspaces/:workspaceId/files/*` → `/api/v1/workspaces/:workspaceId/remote-files/*`

  The previous shared base path could not host both controllers in the same app. The Studio API client now takes a `'local' | 'remote'` variant and routes to the matching path; `useFileTree` / `useFileContent` hooks accept the variant as their first argument.

  **Feature-registration keys (breaking):**
  - `registerFeature('fileExplorer', …)` → `registerFeature('localFileExplorer', …)` (in `LocalFileExplorerModule`) and `registerFeature('remoteFileExplorer', …)` (in `RemoteFileExplorerModule`).
  - Studio's `AVAILABLE_FEATURES` registry exposes `localFileExplorer` and `remoteFileExplorer` instead of `fileExplorer`.

  **Other:**
  - `RemoteFileExplorerController.tree` no longer defaults `path` to `./src` — it now walks the workspace root when `path` is omitted, matching the local controller.

  No backwards-compatibility shim — the old key/URL forms are removed.

### Patch Changes

- Updated dependencies [[`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89)]:
  - @loopstack/common@0.36.0
  - @loopstack/contracts@0.36.0
  - @loopstack/core@0.36.0

## 0.24.4

### Patch Changes

- Updated dependencies [[`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c)]:
  - @loopstack/common@0.35.0
  - @loopstack/core@0.35.0
  - @loopstack/contracts@0.35.0

## 0.24.3

### Patch Changes

- Updated dependencies [[`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c), [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c), [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c)]:
  - @loopstack/common@0.34.0
  - @loopstack/contracts@0.34.0
  - @loopstack/core@0.34.0

## 0.24.2

### Patch Changes

- [#178](https://github.com/loopstack-ai/loopstack/pull/178) [`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Propagate `LoopstackContext` → `RunContext` rename to tool `handle()` signatures. Rewrite registry READMEs to the canonical template and consolidate the per-package `SETUP.md` content into each README.

- Updated dependencies [[`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b)]:
  - @loopstack/common@0.33.0
  - @loopstack/core@0.33.0

## 0.24.1

### Patch Changes

- [#176](https://github.com/loopstack-ai/loopstack/pull/176) [`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Move framework dependencies to devDependencies + peerDependencies

- Updated dependencies [[`228d08b`](https://github.com/loopstack-ai/loopstack/commit/228d08b807915ecfa6ef8275714500750e797036), [`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8)]:
  - @loopstack/core@0.32.3
  - @loopstack/contracts@0.32.3
  - @loopstack/common@0.32.3

## 0.24.0

### Minor Changes

- [#170](https://github.com/loopstack-ai/loopstack/pull/170) [`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - feat(framework): rework framework components and align with NestJs practices

### Patch Changes

- Updated dependencies [[`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c)]:
  - @loopstack/contracts@0.32.0
  - @loopstack/common@0.32.0
  - @loopstack/core@0.32.0

## 0.23.1

### Patch Changes

- [#156](https://github.com/loopstack-ai/loopstack/pull/156) [`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Adapt to new FrameworkContext shape (ctx.run, ctx.app, ctx.workflow)

- Updated dependencies [[`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1)]:
  - @loopstack/contracts@0.31.0
  - @loopstack/common@0.31.0
  - @loopstack/core@0.31.0

## 0.23.0

### Minor Changes

- [#147](https://github.com/loopstack-ai/loopstack/pull/147) [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Nodenext ts options

### Patch Changes

- Updated dependencies [[`6847dd4`](https://github.com/loopstack-ai/loopstack/commit/6847dd43d390b090388b2eddfc2ec50d8b4cc3c1), [`a220472`](https://github.com/loopstack-ai/loopstack/commit/a220472529f50ac5957f960787f742bdf57ab511), [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b)]:
  - @loopstack/core@0.30.0
  - @loopstack/common@0.30.0
  - @loopstack/contracts@0.30.0

## 0.22.6

### Patch Changes

- Updated dependencies [[`4adc8f9`](https://github.com/loopstack-ai/loopstack/commit/4adc8f9e9b6b0b85787cea4d800cfe1142c421f3)]:
  - @loopstack/contracts@0.29.0
  - @loopstack/common@0.29.0
  - @loopstack/core@0.29.0

## 0.22.5

### Patch Changes

- Updated dependencies [[`189e733`](https://github.com/loopstack-ai/loopstack/commit/189e733748074d015a41290ab45c7a46be92253c)]:
  - @loopstack/contracts@0.28.0
  - @loopstack/common@0.28.0
  - @loopstack/core@0.28.0

## 0.22.4

### Patch Changes

- Updated dependencies [[`03f8e93`](https://github.com/loopstack-ai/loopstack/commit/03f8e93434ca35d4428206488275741d76cb25df), [`6bd6e28`](https://github.com/loopstack-ai/loopstack/commit/6bd6e283b2b3e7526d7e89397f7e5c9b73d73316)]:
  - @loopstack/contracts@0.27.0
  - @loopstack/common@0.27.0
  - @loopstack/core@0.27.0

## 0.22.3

### Patch Changes

- [#129](https://github.com/loopstack-ai/loopstack/pull/129) [`5ede93c`](https://github.com/loopstack-ai/loopstack/commit/5ede93c2f8a8c360d10b865dd2d83646d0d7155d) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add local and remote file explorer registry modules for workspace file browsing

- Updated dependencies [[`bff1bfa`](https://github.com/loopstack-ai/loopstack/commit/bff1bfa3f8de0800c26537ce289f672493ec6c7c)]:
  - @loopstack/core@0.26.0
  - @loopstack/common@0.26.0
