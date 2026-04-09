# @loopstack/meeting-notes-example-workflow

## 0.21.1

### Patch Changes

- [#118](https://github.com/loopstack-ai/loopstack/pull/118) [`4581a57`](https://github.com/loopstack-ai/loopstack/commit/4581a57fd714222869af433a4de9957ba7ad8805) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Update readme

## 0.21.0

### Minor Changes

- [#114](https://github.com/loopstack-ai/loopstack/pull/114) [`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Migrate to workflow core v2

### Patch Changes

- [#114](https://github.com/loopstack-ai/loopstack/pull/114) [`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Update example workflows to use new widgets UI schema format

- Updated dependencies [[`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154), [`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154), [`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154)]:
  - @loopstack/core@0.25.0
  - @loopstack/claude-module@0.22.0
  - @loopstack/common@0.25.0

## 0.20.7

### Patch Changes

- [#109](https://github.com/loopstack-ai/loopstack/pull/109) [`79fb4f7`](https://github.com/loopstack-ai/loopstack/commit/79fb4f781b9742bd45edc38340adc67511d6cfb8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add secrets and test-ui-documents examples, migrate all examples from core-ui-module to core
  - New secrets-example-workflow demonstrating secret request and verification flow
  - New test-ui-documents-example-workflow (moved from deleted core-ui-module)
  - Update all existing examples to use @loopstack/core instead of @loopstack/core-ui-module
  - Remove @loopstack/core-ui-module dependency from app-template

- Updated dependencies [[`79fb4f7`](https://github.com/loopstack-ai/loopstack/commit/79fb4f781b9742bd45edc38340adc67511d6cfb8), [`79fb4f7`](https://github.com/loopstack-ai/loopstack/commit/79fb4f781b9742bd45edc38340adc67511d6cfb8)]:
  - @loopstack/core@0.24.0
  - @loopstack/common@0.24.0
  - @loopstack/claude-module@0.21.1

## 0.20.6

### Patch Changes

- [#98](https://github.com/loopstack-ai/loopstack/pull/98) [`4f88d3f`](https://github.com/loopstack-ai/loopstack/commit/4f88d3f5b9990b425e7dcb83f28c042b10881d29) Thanks [@jakobklippel](https://github.com/jakobklippel)! - move transition property into action options object

- Updated dependencies [[`07e62db`](https://github.com/loopstack-ai/loopstack/commit/07e62db4140f6c22c3fd4ecd6b88a32f82ffb0ed)]:
  - @loopstack/common@0.23.0
  - @loopstack/core-ui-module@0.20.6
  - @loopstack/ai-module@0.20.6

## 0.20.5

### Patch Changes

- Updated dependencies [[`34f00b1`](https://github.com/loopstack-ai/loopstack/commit/34f00b18ed5d76745a0c73980964713136dc5c38), [`2606b29`](https://github.com/loopstack-ai/loopstack/commit/2606b29d3bcf893f41b2d5e7d47fb1c5323e4135)]:
  - @loopstack/ai-module@0.20.5
  - @loopstack/common@0.22.0
  - @loopstack/core-ui-module@0.20.5

## 0.20.4

### Patch Changes

- [#80](https://github.com/loopstack-ai/loopstack/pull/80) [`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Various security related updates

- Updated dependencies [[`65fbbee`](https://github.com/loopstack-ai/loopstack/commit/65fbbeef7bda3a328327adf0fa451052c4ce86ba), [`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1), [`37df097`](https://github.com/loopstack-ai/loopstack/commit/37df0972404fc9601906619a7b64fa088395e0ee)]:
  - @loopstack/ai-module@0.20.4
  - @loopstack/common@0.21.0
  - @loopstack/core-ui-module@0.20.4

## 0.20.4-rc.0

### Patch Changes

- [#80](https://github.com/loopstack-ai/loopstack/pull/80) [`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Various security related updates

- Updated dependencies [[`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1), [`37df097`](https://github.com/loopstack-ai/loopstack/commit/37df0972404fc9601906619a7b64fa088395e0ee)]:
  - @loopstack/core-ui-module@0.20.4-rc.0
  - @loopstack/ai-module@0.20.4-rc.0
  - @loopstack/common@0.21.0-rc.0

## 0.20.3

### Patch Changes

- [#77](https://github.com/loopstack-ai/loopstack/pull/77) [`e2e993b`](https://github.com/loopstack-ai/loopstack/commit/e2e993b9c970683257cae79526e5f86ac5169503) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Create dependent packages auto configuration through cli

- Updated dependencies [[`e2e993b`](https://github.com/loopstack-ai/loopstack/commit/e2e993b9c970683257cae79526e5f86ac5169503)]:
  - @loopstack/core-ui-module@0.20.3
  - @loopstack/ai-module@0.20.3

## 0.20.2

### Patch Changes

- [#73](https://github.com/loopstack-ai/loopstack/pull/73) [`fd4eb8d`](https://github.com/loopstack-ai/loopstack/commit/fd4eb8d09f510c37fe931484ae58a1b40715cf65) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add standardized install mode handling for using loopstack cli

- [#75](https://github.com/loopstack-ai/loopstack/pull/75) [`d14b367`](https://github.com/loopstack-ai/loopstack/commit/d14b36797f68201c1cc59c9d976ff83935e7aac8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Allow stateless workflow execution

- Updated dependencies [[`fd4eb8d`](https://github.com/loopstack-ai/loopstack/commit/fd4eb8d09f510c37fe931484ae58a1b40715cf65), [`d14b367`](https://github.com/loopstack-ai/loopstack/commit/d14b36797f68201c1cc59c9d976ff83935e7aac8), [`e4945ab`](https://github.com/loopstack-ai/loopstack/commit/e4945ab0596cd074213923f38d1d8fe239fb6ceb), [`e49ea39`](https://github.com/loopstack-ai/loopstack/commit/e49ea392fc736048f165e8dfaab79d97125ec77c)]:
  - @loopstack/core-ui-module@0.20.2
  - @loopstack/ai-module@0.20.2
  - @loopstack/common@0.20.3

## 0.20.1

### Patch Changes

- [#65](https://github.com/loopstack-ai/loopstack/pull/65) [`ee9a033`](https://github.com/loopstack-ai/loopstack/commit/ee9a033fbbd7640ce951546d7593914e0cac852d) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add JEXL support, update template expression syntax

- Updated dependencies [[`ee9a033`](https://github.com/loopstack-ai/loopstack/commit/ee9a033fbbd7640ce951546d7593914e0cac852d)]:
  - @loopstack/core-ui-module@0.20.1
  - @loopstack/ai-module@0.20.1

## 0.20.0

### Minor Changes

- [#58](https://github.com/loopstack-ai/loopstack/pull/58) [`fa32ec4`](https://github.com/loopstack-ai/loopstack/commit/fa32ec48d3b511586ff1e7746f1d63b72d7c5570) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Implement property decorators to replace class decorators With\*

### Patch Changes

- Updated dependencies [[`fa32ec4`](https://github.com/loopstack-ai/loopstack/commit/fa32ec48d3b511586ff1e7746f1d63b72d7c5570)]:
  - @loopstack/core-ui-module@0.20.0
  - @loopstack/ai-module@0.20.0
  - @loopstack/common@0.20.0

## 0.19.0

### Minor Changes

- [#44](https://github.com/loopstack-ai/loopstack/pull/44) [`b20801c`](https://github.com/loopstack-ai/loopstack/commit/b20801ce956557dbd2eae22ae02c8d45954f8bf8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Replace abstract block classes with interfaces, various bugfixes

### Patch Changes

- [#48](https://github.com/loopstack-ai/loopstack/pull/48) [`d505f2f`](https://github.com/loopstack-ai/loopstack/commit/d505f2f42bf06329b316e73819bc639a07a5e492) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Move loopstack cli info to package.json

- Updated dependencies [[`b20801c`](https://github.com/loopstack-ai/loopstack/commit/b20801ce956557dbd2eae22ae02c8d45954f8bf8), [`d505f2f`](https://github.com/loopstack-ai/loopstack/commit/d505f2f42bf06329b316e73819bc639a07a5e492)]:
  - @loopstack/core-ui-module@0.19.0
  - @loopstack/ai-module@0.19.0
  - @loopstack/common@0.19.0

## 0.19.0-rc.1

### Patch Changes

- [#48](https://github.com/loopstack-ai/loopstack/pull/48) [`d505f2f`](https://github.com/loopstack-ai/loopstack/commit/d505f2f42bf06329b316e73819bc639a07a5e492) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Move loopstack cli info to package.json

- Updated dependencies [[`d505f2f`](https://github.com/loopstack-ai/loopstack/commit/d505f2f42bf06329b316e73819bc639a07a5e492)]:
  - @loopstack/core-ui-module@0.19.0-rc.1
  - @loopstack/ai-module@0.19.0-rc.1
  - @loopstack/common@0.19.0-rc.1

## 0.19.0-rc.0

### Minor Changes

- [#44](https://github.com/loopstack-ai/loopstack/pull/44) [`b20801c`](https://github.com/loopstack-ai/loopstack/commit/b20801ce956557dbd2eae22ae02c8d45954f8bf8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Replace abstract block classes with interfaces, various bugfixes

### Patch Changes

- Updated dependencies [[`b20801c`](https://github.com/loopstack-ai/loopstack/commit/b20801ce956557dbd2eae22ae02c8d45954f8bf8)]:
  - @loopstack/core-ui-module@0.19.0-rc.0
  - @loopstack/ai-module@0.19.0-rc.0
  - @loopstack/common@0.19.0-rc.0

## 0.18.1

### Patch Changes

- [#36](https://github.com/loopstack-ai/loopstack/pull/36) [`1af9cd4`](https://github.com/loopstack-ai/loopstack/commit/1af9cd4edb37b60e3df677ba450ad22a936f447d) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add loopstack-module config and update readme files

- Updated dependencies [[`1af9cd4`](https://github.com/loopstack-ai/loopstack/commit/1af9cd4edb37b60e3df677ba450ad22a936f447d)]:
  - @loopstack/core-ui-module@0.18.1
  - @loopstack/ai-module@0.18.1

## 0.18.0

### Minor Changes

- [#13](https://github.com/loopstack-ai/loopstack/pull/13) [`13ab1a7`](https://github.com/loopstack-ai/loopstack/commit/13ab1a792a12bc46e0a21cf1ac038a7e69c566df) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Added from external repository

### Patch Changes

- Updated dependencies [[`eea1b9f`](https://github.com/loopstack-ai/loopstack/commit/eea1b9ff10eaf8eda2a1bd4c2042148f964d5a39), [`e556176`](https://github.com/loopstack-ai/loopstack/commit/e5561769b365218f1ffdc890b887e7b607d06101), [`4ee0af1`](https://github.com/loopstack-ai/loopstack/commit/4ee0af1536e7802eb9d69a788c10184e3c5a7a11), [`3fd1db5`](https://github.com/loopstack-ai/loopstack/commit/3fd1db5d0de8ad26e3e22348f7f1593024a74273)]:
  - @loopstack/ai-module@0.18.0
  - @loopstack/core-ui-module@0.18.0
  - @loopstack/core@0.18.0
  - @loopstack/common@0.18.0

## 0.18.0-rc.0

### Minor Changes

- [#13](https://github.com/loopstack-ai/loopstack/pull/13) [`13ab1a7`](https://github.com/loopstack-ai/loopstack/commit/13ab1a792a12bc46e0a21cf1ac038a7e69c566df) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Added from external repository

### Patch Changes

- Updated dependencies [[`eea1b9f`](https://github.com/loopstack-ai/loopstack/commit/eea1b9ff10eaf8eda2a1bd4c2042148f964d5a39)]:
  - @loopstack/ai-module@0.18.0-rc.0
  - @loopstack/common@0.18.0-rc.1
  - @loopstack/core@0.18.0-rc.1
