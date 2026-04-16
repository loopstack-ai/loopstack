# @loopstack/loopstack-studio

## 0.26.1

### Patch Changes

- Updated dependencies [[`03f8e93`](https://github.com/loopstack-ai/loopstack/commit/03f8e93434ca35d4428206488275741d76cb25df), [`6bd6e28`](https://github.com/loopstack-ai/loopstack/commit/6bd6e283b2b3e7526d7e89397f7e5c9b73d73316)]:
  - @loopstack/contracts@0.27.0

## 0.26.0

### Minor Changes

- [#129](https://github.com/loopstack-ai/loopstack/pull/129) [`6ef3915`](https://github.com/loopstack-ai/loopstack/commit/6ef3915cb067a44d78537410a9ef8491acd65617) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add environment management panel, refactor workbench layout with resizable sidebar panels, and replace Insights with Favourites

- [#129](https://github.com/loopstack-ai/loopstack/pull/129) [`bff1bfa`](https://github.com/loopstack-ai/loopstack/commit/bff1bfa3f8de0800c26537ce289f672493ec6c7c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add feature registry plugin architecture for extensible sidebar panels and document renderers, move secrets UI into secrets feature plugin

## 0.25.2

### Patch Changes

- [#124](https://github.com/loopstack-ai/loopstack/pull/124) [`598a7bc`](https://github.com/loopstack-ai/loopstack/commit/598a7bca418f5fdebb695c3ee56b2ea9c0cbdf22) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Revert deps

- Updated dependencies [[`598a7bc`](https://github.com/loopstack-ai/loopstack/commit/598a7bca418f5fdebb695c3ee56b2ea9c0cbdf22)]:
  - @loopstack/contracts@0.25.2

## 0.25.1

### Patch Changes

- [#121](https://github.com/loopstack-ai/loopstack/pull/121) [`0de6c53`](https://github.com/loopstack-ai/loopstack/commit/0de6c53e23342987a0d2ae182a6c2c473657a71f) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Update dependencies

- Updated dependencies [[`0de6c53`](https://github.com/loopstack-ai/loopstack/commit/0de6c53e23342987a0d2ae182a6c2c473657a71f)]:
  - @loopstack/contracts@0.25.1

## 0.25.0

### Minor Changes

- [#114](https://github.com/loopstack-ai/loopstack/pull/114) [`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Refactor UI schema from actions/form to unified widgets array and add transition-level state assignments

- [#114](https://github.com/loopstack-ai/loopstack/pull/114) [`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Migrate to workflow core v2

### Patch Changes

- Updated dependencies [[`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154), [`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154)]:
  - @loopstack/contracts@0.25.0

## 0.24.0

### Minor Changes

- [#109](https://github.com/loopstack-ai/loopstack/pull/109) [`79fb4f7`](https://github.com/loopstack-ai/loopstack/commit/79fb4f781b9742bd45edc38340adc67511d6cfb8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add secrets management system and consolidate document types into core
  - New SecretEntity, SecretService, and SecretController with full CRUD API
  - Move built-in document types (error, link, markdown, message, plain) from core-ui-module into core
  - Add SecretRequestDocument and RequestSecretsTool for workflow-driven secret collection
  - Add CreateDocument tool for dynamic document creation in workflows
  - Add secrets management panel and SecretInput widget to Studio
  - Refactor ToolResult.effects to array and add ToolCallEntry/ToolCallsMap interfaces
  - Simplify UiElementSchema in contracts

### Patch Changes

- Updated dependencies [[`79fb4f7`](https://github.com/loopstack-ai/loopstack/commit/79fb4f781b9742bd45edc38340adc67511d6cfb8)]:
  - @loopstack/contracts@0.24.0

## 0.23.1

### Patch Changes

- [#106](https://github.com/loopstack-ai/loopstack/pull/106) [`75416d0`](https://github.com/loopstack-ai/loopstack/commit/75416d062351ee4db69786388ef022b5ee13ab0e) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add Claude message document renderer with support for thinking blocks, tool use, and tool results

- Updated dependencies [[`8d9273e`](https://github.com/loopstack-ai/loopstack/commit/8d9273e5e08191682364c4b1282953e24a929f43)]:
  - @loopstack/contracts@0.23.1

## 0.23.0

### Minor Changes

- [#101](https://github.com/loopstack-ai/loopstack/pull/101) [`faac66e`](https://github.com/loopstack-ai/loopstack/commit/faac66eea4b7aa80e4f17b4575bccef347bbde29) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add sidebar navigation, new run dialog on runs overview, and action required page

### Patch Changes

- [#101](https://github.com/loopstack-ai/loopstack/pull/101) [`2b208fb`](https://github.com/loopstack-ai/loopstack/commit/2b208fb877c2614519915990d99320f16556000e) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add configurable embed prefix to router, local environment health check, and local connectable env support

## 0.22.0

### Minor Changes

- [#98](https://github.com/loopstack-ai/loopstack/pull/98) [`4f88d3f`](https://github.com/loopstack-ai/loopstack/commit/4f88d3f5b9990b425e7dcb83f28c042b10881d29) Thanks [@jakobklippel](https://github.com/jakobklippel)! - add runs management pages, landing dashboard, new run dialog, and sandbox preview widget

### Patch Changes

- Updated dependencies [[`4f88d3f`](https://github.com/loopstack-ai/loopstack/commit/4f88d3f5b9990b425e7dcb83f28c042b10881d29)]:
  - @loopstack/contracts@0.23.0

## 0.21.3

### Patch Changes

- [#96](https://github.com/loopstack-ai/loopstack/pull/96) [`567bdbf`](https://github.com/loopstack-ai/loopstack/commit/567bdbf7c41ed94e1ff51c66fb2723dce87bc6e4) Thanks [@jakobklippel](https://github.com/jakobklippel)! - fix form input backgrounds to use background token instead of transparent

## 0.21.2

### Patch Changes

- [#93](https://github.com/loopstack-ai/loopstack/pull/93) [`4ab4d8d`](https://github.com/loopstack-ai/loopstack/commit/4ab4d8de97e8bab1bc8da6d08af3d571e9a906d5) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add EditWorkspace component override and exported EditWorkspaceProps type

- Updated dependencies [[`66f16db`](https://github.com/loopstack-ai/loopstack/commit/66f16db846c3a765ba2ca2d6206d3a17ac7e782b)]:
  - @loopstack/api-client@0.20.1

## 0.21.1

### Patch Changes

- [#86](https://github.com/loopstack-ai/loopstack/pull/86) [`ddc7333`](https://github.com/loopstack-ai/loopstack/commit/ddc733304f2bc4d5e68ff51286233ead066cfe59) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Improve module compatibility

- Updated dependencies [[`34f00b1`](https://github.com/loopstack-ai/loopstack/commit/34f00b18ed5d76745a0c73980964713136dc5c38), [`34f00b1`](https://github.com/loopstack-ai/loopstack/commit/34f00b18ed5d76745a0c73980964713136dc5c38)]:
  - @loopstack/contracts@0.22.0
  - @loopstack/api-client@0.20.0

## 0.21.0

### Minor Changes

- [#80](https://github.com/loopstack-ai/loopstack/pull/80) [`37df097`](https://github.com/loopstack-ai/loopstack/commit/37df0972404fc9601906619a7b64fa088395e0ee) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add remote auth via JWKS for hub authentication

### Patch Changes

- [#80](https://github.com/loopstack-ai/loopstack/pull/80) [`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Various security related updates

- Updated dependencies [[`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1), [`37df097`](https://github.com/loopstack-ai/loopstack/commit/37df0972404fc9601906619a7b64fa088395e0ee)]:
  - @loopstack/api-client@0.19.0
  - @loopstack/contracts@0.21.0

## 0.21.0-rc.0

### Minor Changes

- [#80](https://github.com/loopstack-ai/loopstack/pull/80) [`37df097`](https://github.com/loopstack-ai/loopstack/commit/37df0972404fc9601906619a7b64fa088395e0ee) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add remote auth via JWKS for hub authentication

### Patch Changes

- [#80](https://github.com/loopstack-ai/loopstack/pull/80) [`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Various security related updates

- Updated dependencies [[`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1), [`37df097`](https://github.com/loopstack-ai/loopstack/commit/37df0972404fc9601906619a7b64fa088395e0ee)]:
  - @loopstack/api-client@0.19.0-rc.0
  - @loopstack/contracts@0.21.0-rc.0

## 0.20.3

### Patch Changes

- [#75](https://github.com/loopstack-ai/loopstack/pull/75) [`e49ea39`](https://github.com/loopstack-ai/loopstack/commit/e49ea392fc736048f165e8dfaab79d97125ec77c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Fix sub workflow execution flow and improve ui

- Updated dependencies [[`e4945ab`](https://github.com/loopstack-ai/loopstack/commit/e4945ab0596cd074213923f38d1d8fe239fb6ceb), [`e49ea39`](https://github.com/loopstack-ai/loopstack/commit/e49ea392fc736048f165e8dfaab79d97125ec77c)]:
  - @loopstack/contracts@0.20.3
  - @loopstack/api-client@0.18.2

## 0.20.2

### Patch Changes

- [#67](https://github.com/loopstack-ai/loopstack/pull/67) [`c70108c`](https://github.com/loopstack-ai/loopstack/commit/c70108cd3ff3e1245d0883de34738b72e9bde0f4) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Bugfixes

## 0.20.1

### Patch Changes

- [#65](https://github.com/loopstack-ai/loopstack/pull/65) [`ee9a033`](https://github.com/loopstack-ai/loopstack/commit/ee9a033fbbd7640ce951546d7593914e0cac852d) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add JEXL support, update template expression syntax

- Updated dependencies [[`ee9a033`](https://github.com/loopstack-ai/loopstack/commit/ee9a033fbbd7640ce951546d7593914e0cac852d)]:
  - @loopstack/contracts@0.20.1

## 0.20.0

### Minor Changes

- [#58](https://github.com/loopstack-ai/loopstack/pull/58) [`fa32ec4`](https://github.com/loopstack-ai/loopstack/commit/fa32ec48d3b511586ff1e7746f1d63b72d7c5570) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Implement property decorators to replace class decorators With\*

### Patch Changes

- Updated dependencies [[`fa32ec4`](https://github.com/loopstack-ai/loopstack/commit/fa32ec48d3b511586ff1e7746f1d63b72d7c5570)]:
  - @loopstack/contracts@0.20.0

## 0.19.0

### Minor Changes

- [#44](https://github.com/loopstack-ai/loopstack/pull/44) [`b20801c`](https://github.com/loopstack-ai/loopstack/commit/b20801ce956557dbd2eae22ae02c8d45954f8bf8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Replace abstract block classes with interfaces, various bugfixes

### Patch Changes

- [#48](https://github.com/loopstack-ai/loopstack/pull/48) [`d505f2f`](https://github.com/loopstack-ai/loopstack/commit/d505f2f42bf06329b316e73819bc639a07a5e492) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Move loopstack cli info to package.json

- Updated dependencies [[`b20801c`](https://github.com/loopstack-ai/loopstack/commit/b20801ce956557dbd2eae22ae02c8d45954f8bf8), [`d505f2f`](https://github.com/loopstack-ai/loopstack/commit/d505f2f42bf06329b316e73819bc639a07a5e492)]:
  - @loopstack/contracts@0.19.0

## 0.19.0-rc.1

### Patch Changes

- [#48](https://github.com/loopstack-ai/loopstack/pull/48) [`d505f2f`](https://github.com/loopstack-ai/loopstack/commit/d505f2f42bf06329b316e73819bc639a07a5e492) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Move loopstack cli info to package.json

- Updated dependencies [[`d505f2f`](https://github.com/loopstack-ai/loopstack/commit/d505f2f42bf06329b316e73819bc639a07a5e492)]:
  - @loopstack/contracts@0.19.0-rc.1

## 0.19.0-rc.0

### Minor Changes

- [#44](https://github.com/loopstack-ai/loopstack/pull/44) [`b20801c`](https://github.com/loopstack-ai/loopstack/commit/b20801ce956557dbd2eae22ae02c8d45954f8bf8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Replace abstract block classes with interfaces, various bugfixes

### Patch Changes

- Updated dependencies [[`b20801c`](https://github.com/loopstack-ai/loopstack/commit/b20801ce956557dbd2eae22ae02c8d45954f8bf8)]:
  - @loopstack/contracts@0.19.0-rc.0

## 0.18.3

### Patch Changes

- [#34](https://github.com/loopstack-ai/loopstack/pull/34) [`2d23ceb`](https://github.com/loopstack-ai/loopstack/commit/2d23cebfad185b7320becf4d53be5d149136da40) Thanks [@TobeyTG](https://github.com/TobeyTG)! - added debug view

- Updated dependencies [[`2d23ceb`](https://github.com/loopstack-ai/loopstack/commit/2d23cebfad185b7320becf4d53be5d149136da40)]:
  - @loopstack/api-client@0.18.1

## 0.18.2

### Patch Changes

- [#31](https://github.com/loopstack-ai/loopstack/pull/31) [`e2db2f1`](https://github.com/loopstack-ai/loopstack/commit/e2db2f196de072c8f0d1b51ebca21491c80e7499) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Revert nginx config

## 0.18.1

### Patch Changes

- [#28](https://github.com/loopstack-ai/loopstack/pull/28) [`30ab62f`](https://github.com/loopstack-ai/loopstack/commit/30ab62f83e3cdf2f53e9323513e888f26e007335) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Use nginx in dockerfile

## 0.18.0

### Minor Changes

- [#8](https://github.com/loopstack-ai/loopstack/pull/8) [`3fd1db5`](https://github.com/loopstack-ai/loopstack/commit/3fd1db5d0de8ad26e3e22348f7f1593024a74273) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Test Release

### Patch Changes

- [#21](https://github.com/loopstack-ai/loopstack/pull/21) [`655e909`](https://github.com/loopstack-ai/loopstack/commit/655e909944abaa8645a7cd1d2ca2354cdf6a1a45) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add workflow debug view

- [#21](https://github.com/loopstack-ai/loopstack/pull/21) [`4bfe36e`](https://github.com/loopstack-ai/loopstack/commit/4bfe36e6ad0e47b26c756392daf6e3d0bd3ddb2d) Thanks [@jakobklippel](https://github.com/jakobklippel)! - refactor(loopstack-studio): remove animations in workflow visualisation

- [#21](https://github.com/loopstack-ai/loopstack/pull/21) [`e556176`](https://github.com/loopstack-ai/loopstack/commit/e5561769b365218f1ffdc890b887e7b607d06101) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Fix various bugs, Replace zod to schema package, fic cli npm install

- Updated dependencies [[`3fd1db5`](https://github.com/loopstack-ai/loopstack/commit/3fd1db5d0de8ad26e3e22348f7f1593024a74273)]:
  - @loopstack/api-client@0.18.0
  - @loopstack/contracts@0.18.0

## 0.18.0-rc.1

### Patch Changes

- [#21](https://github.com/loopstack-ai/loopstack/pull/21) [`655e909`](https://github.com/loopstack-ai/loopstack/commit/655e909944abaa8645a7cd1d2ca2354cdf6a1a45) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add workflow debug view

- [#21](https://github.com/loopstack-ai/loopstack/pull/21) [`4bfe36e`](https://github.com/loopstack-ai/loopstack/commit/4bfe36e6ad0e47b26c756392daf6e3d0bd3ddb2d) Thanks [@jakobklippel](https://github.com/jakobklippel)! - refactor(loopstack-studio): remove animations in workflow visualisation

- [#21](https://github.com/loopstack-ai/loopstack/pull/21) [`e556176`](https://github.com/loopstack-ai/loopstack/commit/e5561769b365218f1ffdc890b887e7b607d06101) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Fix various bugs, Replace zod to schema package, fic cli npm install

- Updated dependencies []:
  - @loopstack/contracts@0.18.0-rc.2

## 0.18.0-rc.0

### Minor Changes

- [#8](https://github.com/loopstack-ai/loopstack/pull/8) [`3fd1db5`](https://github.com/loopstack-ai/loopstack/commit/3fd1db5d0de8ad26e3e22348f7f1593024a74273) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Test Release

### Patch Changes

- Updated dependencies [[`3fd1db5`](https://github.com/loopstack-ai/loopstack/commit/3fd1db5d0de8ad26e3e22348f7f1593024a74273)]:
  - @loopstack/api-client@0.18.0-rc.0
  - @loopstack/contracts@0.18.0-rc.0
