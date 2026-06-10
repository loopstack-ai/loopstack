# @loopstack/code-agent

## 1.0.0

### Patch Changes

- [#178](https://github.com/loopstack-ai/loopstack/pull/178) [`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Propagate `LoopstackContext` → `RunContext` rename to tool `handle()` signatures. Rewrite registry READMEs to the canonical template and consolidate the per-package `SETUP.md` content into each README.

- Updated dependencies [[`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b), [`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b)]:
  - @loopstack/common@1.0.0
  - @loopstack/agent@1.0.0
  - @loopstack/remote-client@1.0.0
  - @loopstack/core@1.0.0

## 0.4.1

### Patch Changes

- [#176](https://github.com/loopstack-ai/loopstack/pull/176) [`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Move framework dependencies to devDependencies + peerDependencies

- Updated dependencies [[`228d08b`](https://github.com/loopstack-ai/loopstack/commit/228d08b807915ecfa6ef8275714500750e797036), [`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8), [`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8)]:
  - @loopstack/core@0.32.3
  - @loopstack/agent@0.5.1
  - @loopstack/remote-client@0.25.1
  - @loopstack/common@0.32.3

## 0.4.0

### Minor Changes

- [#170](https://github.com/loopstack-ai/loopstack/pull/170) [`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - feat(framework): rework framework components and align with NestJs practices

### Patch Changes

- Updated dependencies [[`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c)]:
  - @loopstack/remote-client@0.25.0
  - @loopstack/agent@0.5.0
  - @loopstack/common@0.32.0

## 0.3.1

### Patch Changes

- Updated dependencies [[`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1), [`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1)]:
  - @loopstack/common@0.31.0
  - @loopstack/core@0.31.0
  - @loopstack/agent@0.4.1
  - @loopstack/remote-client@0.24.1

## 0.3.0

### Minor Changes

- [#147](https://github.com/loopstack-ai/loopstack/pull/147) [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Nodenext ts options

### Patch Changes

- Updated dependencies [[`6847dd4`](https://github.com/loopstack-ai/loopstack/commit/6847dd43d390b090388b2eddfc2ec50d8b4cc3c1), [`a220472`](https://github.com/loopstack-ai/loopstack/commit/a220472529f50ac5957f960787f742bdf57ab511), [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b)]:
  - @loopstack/core@0.30.0
  - @loopstack/common@0.30.0
  - @loopstack/remote-client@0.24.0
  - @loopstack/agent@0.4.0

## 0.2.1

### Patch Changes

- [#143](https://github.com/loopstack-ai/loopstack/pull/143) [`4adc8f9`](https://github.com/loopstack-ai/loopstack/commit/4adc8f9e9b6b0b85787cea4d800cfe1142c421f3) Thanks [@github-actions](https://github.com/apps/github-actions)! - Adapt tools and examples to LLM provider registry; fix optional tool args and call signatures

- Updated dependencies [[`4adc8f9`](https://github.com/loopstack-ai/loopstack/commit/4adc8f9e9b6b0b85787cea4d800cfe1142c421f3)]:
  - @loopstack/common@0.29.0
  - @loopstack/core@0.29.0
  - @loopstack/agent@0.3.0
  - @loopstack/remote-client@0.23.4

## 0.2.0

### Minor Changes

- [#135](https://github.com/loopstack-ai/loopstack/pull/135) [`d5e7897`](https://github.com/loopstack-ai/loopstack/commit/d5e789797c5ccc38a9a65a51402f56ba63ac01f0) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add workspace tool installation to CLI and refactor code-agent to use generic AgentWorkflow

### Patch Changes

- Updated dependencies [[`d5e7897`](https://github.com/loopstack-ai/loopstack/commit/d5e789797c5ccc38a9a65a51402f56ba63ac01f0), [`189e733`](https://github.com/loopstack-ai/loopstack/commit/189e733748074d015a41290ab45c7a46be92253c)]:
  - @loopstack/agent@0.2.0
  - @loopstack/common@0.28.0
  - @loopstack/core@0.28.0
  - @loopstack/remote-client@0.23.3

## 0.1.1

### Patch Changes

- [#132](https://github.com/loopstack-ai/loopstack/pull/132) [`3911d9e`](https://github.com/loopstack-ai/loopstack/commit/3911d9e10d47c75bc36e5391562a3ee62eb3fa31) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add code-agent module with AI-powered codebase exploration workflow using Claude

- Updated dependencies []:
  - @loopstack/common@0.27.0
  - @loopstack/core@0.27.0
  - @loopstack/claude-module@0.22.4
  - @loopstack/remote-client@0.23.2
