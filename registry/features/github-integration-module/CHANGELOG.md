# @loopstack/github-integration

## 0.4.2

### Patch Changes

- [#178](https://github.com/loopstack-ai/loopstack/pull/178) [`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Propagate `LoopstackContext` → `RunContext` rename to tool `handle()` signatures. Rewrite registry READMEs to the canonical template and consolidate the per-package `SETUP.md` content into each README.

- Updated dependencies [[`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b), [`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b)]:
  - @loopstack/common@0.33.0
  - @loopstack/git-module@0.3.2
  - @loopstack/github-module@0.4.2
  - @loopstack/hitl@0.4.2
  - @loopstack/oauth-module@0.4.2
  - @loopstack/remote-client@0.25.2
  - @loopstack/core@0.33.0

## 0.4.1

### Patch Changes

- [#176](https://github.com/loopstack-ai/loopstack/pull/176) [`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Move framework dependencies to devDependencies + peerDependencies

- Updated dependencies [[`228d08b`](https://github.com/loopstack-ai/loopstack/commit/228d08b807915ecfa6ef8275714500750e797036), [`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8), [`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8)]:
  - @loopstack/core@0.32.3
  - @loopstack/git-module@0.3.1
  - @loopstack/github-module@0.4.1
  - @loopstack/hitl@0.4.1
  - @loopstack/oauth-module@0.4.1
  - @loopstack/remote-client@0.25.1
  - @loopstack/common@0.32.3

## 0.4.0

### Minor Changes

- [#170](https://github.com/loopstack-ai/loopstack/pull/170) [`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - feat(framework): rework framework components and align with NestJs practices

### Patch Changes

- Updated dependencies [[`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c)]:
  - @loopstack/remote-client@0.25.0
  - @loopstack/github-module@0.4.0
  - @loopstack/oauth-module@0.4.0
  - @loopstack/hitl@0.4.0
  - @loopstack/git-module@0.3.0
  - @loopstack/common@0.32.0
  - @loopstack/core@0.32.0

## 0.3.1

### Patch Changes

- [#156](https://github.com/loopstack-ai/loopstack/pull/156) [`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Adapt to new FrameworkContext shape (ctx.run, ctx.app, ctx.workflow)

- Updated dependencies [[`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1), [`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1)]:
  - @loopstack/common@0.31.0
  - @loopstack/core@0.31.0
  - @loopstack/git-module@0.2.1
  - @loopstack/github-module@0.3.1
  - @loopstack/hitl@0.3.1
  - @loopstack/oauth-module@0.3.1
  - @loopstack/remote-client@0.24.1

## 0.3.0

### Minor Changes

- [#147](https://github.com/loopstack-ai/loopstack/pull/147) [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Nodenext ts options

### Patch Changes

- Updated dependencies [[`6847dd4`](https://github.com/loopstack-ai/loopstack/commit/6847dd43d390b090388b2eddfc2ec50d8b4cc3c1), [`a220472`](https://github.com/loopstack-ai/loopstack/commit/a220472529f50ac5957f960787f742bdf57ab511), [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b)]:
  - @loopstack/core@0.30.0
  - @loopstack/common@0.30.0
  - @loopstack/remote-client@0.24.0
  - @loopstack/github-module@0.3.0
  - @loopstack/oauth-module@0.3.0
  - @loopstack/hitl@0.3.0
  - @loopstack/git-module@0.2.0

## 0.2.3

### Patch Changes

- [#143](https://github.com/loopstack-ai/loopstack/pull/143) [`4adc8f9`](https://github.com/loopstack-ai/loopstack/commit/4adc8f9e9b6b0b85787cea4d800cfe1142c421f3) Thanks [@github-actions](https://github.com/apps/github-actions)! - Adapt tools and examples to LLM provider registry; fix optional tool args and call signatures

- Updated dependencies [[`4adc8f9`](https://github.com/loopstack-ai/loopstack/commit/4adc8f9e9b6b0b85787cea4d800cfe1142c421f3), [`4adc8f9`](https://github.com/loopstack-ai/loopstack/commit/4adc8f9e9b6b0b85787cea4d800cfe1142c421f3)]:
  - @loopstack/common@0.29.0
  - @loopstack/core@0.29.0
  - @loopstack/git-module@0.1.3
  - @loopstack/github-module@0.2.5
  - @loopstack/hitl@0.2.1
  - @loopstack/oauth-module@0.2.7
  - @loopstack/remote-client@0.23.4

## 0.2.2

### Patch Changes

- Updated dependencies [[`4ecc33e`](https://github.com/loopstack-ai/loopstack/commit/4ecc33e9efc2ce44f9d187644acf5bbe47244718)]:
  - @loopstack/hitl@0.2.0

## 0.2.1

### Patch Changes

- Updated dependencies [[`432f21e`](https://github.com/loopstack-ai/loopstack/commit/432f21e8bd0345ff790d2a0b2b5a91a03a159bc0), [`df77219`](https://github.com/loopstack-ai/loopstack/commit/df77219aef8278619a895c496493b12d85122f21), [`189e733`](https://github.com/loopstack-ai/loopstack/commit/189e733748074d015a41290ab45c7a46be92253c)]:
  - @loopstack/github-module@0.2.4
  - @loopstack/common@0.28.0
  - @loopstack/core@0.28.0
  - @loopstack/git-module@0.1.2
  - @loopstack/hitl@0.1.2
  - @loopstack/oauth-module@0.2.6
  - @loopstack/remote-client@0.23.3

## 0.2.0

### Minor Changes

- [#132](https://github.com/loopstack-ai/loopstack/pull/132) [`03f8e93`](https://github.com/loopstack-ai/loopstack/commit/03f8e93434ca35d4428206488275741d76cb25df) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add GitHub integration module with OAuth connect workflow for linking and syncing repositories

### Patch Changes

- Updated dependencies [[`3911d9e`](https://github.com/loopstack-ai/loopstack/commit/3911d9e10d47c75bc36e5391562a3ee62eb3fa31), [`6bd6e28`](https://github.com/loopstack-ai/loopstack/commit/6bd6e283b2b3e7526d7e89397f7e5c9b73d73316)]:
  - @loopstack/hitl@0.1.1
  - @loopstack/git-module@0.1.1
  - @loopstack/common@0.27.0
  - @loopstack/core@0.27.0
  - @loopstack/oauth-module@0.2.5
  - @loopstack/remote-client@0.23.2
