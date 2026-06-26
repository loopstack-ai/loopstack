# @loopstack/api

## 0.36.0

### Minor Changes

- [#228](https://github.com/loopstack-ai/loopstack/pull/228) [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Cleanup of the `documentStore.save` options taxonomy. Three related changes:

  **1. `id` → `key` (rename).** `DocumentSaveOptions.id` is now `key`, and the underlying entity field/column moved from `messageId` / `message_id` to `key`. The option is used for non-message documents too (forms, transcripts, status docs), so the LLM-flavored name was misleading — `key` accurately names the concept (stable upsert key that invalidates the previous row in place). Synchronize mode handles the column rename; no migration shipped.

  **2. New `internal` decorator option + entity column.** `@Document({ internal: true })` marks a document type as framework plumbing. Internal documents are persisted server-side and still readable by code that queries the document store (e.g. LLM providers building conversation history), but they're excluded from REST API responses — Studio never sees them. The filter is applied at the API boundary (`DocumentApiService.findAll` / `findOneById`); the repository itself stays unfiltered so server-side callers compose their own queries. `StaticDocumentMeta.hidden` is gone — it was the half-measure this replaces.

  **3. New `LlmContextDocument` type.** Symmetric with `LlmMessageDocument` (`{ role: 'user' | 'assistant', text }`) but declared `@Document({ internal: true, tags: ['message'] })`. The `'message'` tag keeps it in the LLM provider's conversation-history gather; `internal: true` keeps it out of Studio. Replaces the prior `{ meta: { hidden: true } }` flag on `LlmMessageDocument` saves — 9 call sites across `@loopstack/agent`, sandbox/app-builder, and registry examples migrated to the new type.

  **Migration:**

  ```ts
  // before
  await this.documentStore.save(Doc, content, { id: 'status' });
  await this.documentStore.save(LlmMessageDocument, { role: 'user', text }, { meta: { hidden: true } });

  // after
  await this.documentStore.save(Doc, content, { key: 'status' });
  await this.documentStore.save(LlmContextDocument, { role: 'user', text });
  ```

### Patch Changes

- [#228](https://github.com/loopstack-ai/loopstack/pull/228) [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Unify the `wait: true` payload shape. Every wait transition now receives the same envelope, `TransitionInput<TData, TMeta>`, regardless of whether the resume came from a sub-workflow completion or a frontend / API trigger:

  ```ts
  interface TransitionInput<TData = unknown, TMeta = unknown> {
    workflowId: string;
    status: 'completed' | 'failed' | 'canceled';
    hasError: boolean;
    errorMessage: string | null;
    data: TData;
    meta?: TMeta;
  }
  ```

  The `schema:` option on `@Transition({ wait: true })` now describes **only `data`** — the framework constructs the surrounding envelope. Authors no longer extend a base callback schema; they declare the data shape they expect and receive the full envelope on the transition method. The frontend can now signal `status: 'failed' | 'canceled'` + `errorMessage` via the `/processor/run/:workflowId` API so user-driven HITL flows can model "user declined" alongside sub-workflow failures using the same `input.hasError` branch.

  **Breaking changes:**
  - `CallbackSchema` is removed from `@loopstack/common`. Replace `schema: CallbackSchema.extend({ data: z.object({ ... }) })` with `schema: z.object({ ... })` and type the parameter as `input: TransitionInput<TData>`.
  - `FanOutCallbackSchema` / `FanOutCallbackPayload` are removed from `@loopstack/core` and replaced with `FanOutResultSchema` (the inner data shape). Same for `SequenceCallbackSchema` / `SequenceCallbackPayload` → `SequenceResultSchema`.
  - Wait transitions that previously received the raw payload directly (e.g. `payload: string` for chat user-input) now receive `input: TransitionInput<string>`; access via `input.data`.
  - The orchestrator's callback envelope renames `_subscriberMetadata` → `meta`. `FanOutWorkflow` / `SequenceWorkflow` and `LlmDelegateService.updateToolResult()` now read correlation metadata from `input.meta` / `payload.meta`.

  **Migration:**

  ```ts
  // Before
  import { CallbackSchema } from '@loopstack/common';
  const AnswerCallback = CallbackSchema.extend({ data: z.object({ answer: z.string() }) });
  @Transition({ wait: true, schema: AnswerCallback })
  async onAnswer(state, payload: z.infer<typeof AnswerCallback>) {
    payload.data.answer;
    payload.hasError;
  }

  // After
  import type { TransitionInput } from '@loopstack/common';
  @Transition({ wait: true, schema: z.object({ answer: z.string() }) })
  async onAnswer(state, input: TransitionInput<{ answer: string }>) {
    input.data.answer;
    input.hasError;
  }
  ```

  All registry features, examples, and docs (including `sub-workflows.md`, `human-in-the-loop.md`, `workflows.md`, the HITL tutorial, and every registry README) have been swept to the new shape. No backwards-compatibility shim — the old `CallbackSchema` export and the `_subscriberMetadata` field are removed outright.

- Updated dependencies [[`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89), [`8ddbf25`](https://github.com/loopstack-ai/loopstack/commit/8ddbf253dee7a4ebf7530970d8c04dbe50ba4d89)]:
  - @loopstack/common@0.36.0
  - @loopstack/contracts@0.36.0
  - @loopstack/core@0.36.0
  - @loopstack/auth@0.36.0

## 0.35.0

### Minor Changes

- [#218](https://github.com/loopstack-ai/loopstack/pull/218) [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Slim `GET /workflows/:id/status` endpoint plus a `useWorkflowStatus` hook so Studio's embedded sub-workflow link cards react to live state without pulling the full workflow payload on every SSE tick. The link card now auto-collapses when its child reaches a terminal state, and its initial expanded value is deferred until the live status arrives — so waiting/running children stay expanded on reload, completed ones come back collapsed, and there is no expand-then-collapse flicker. `WORKFLOW_UPDATED` SSE messages now carry `parentId` so the parent's children-list cache is invalidated when a child transitions, which keeps the execution timeline, workflow list, and history list in sync with live child status.

### Patch Changes

- Updated dependencies [[`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c), [`0cab7cb`](https://github.com/loopstack-ai/loopstack/commit/0cab7cbcc25fc6ddf5705264f24136891428100c)]:
  - @loopstack/common@0.35.0
  - @loopstack/core@0.35.0
  - @loopstack/contracts@0.35.0
  - @loopstack/auth@0.35.0

## 0.34.0

### Patch Changes

- Updated dependencies [[`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c), [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c), [`dfc1694`](https://github.com/loopstack-ai/loopstack/commit/dfc1694b9bf585b3c61a127c58f07c8da964280c)]:
  - @loopstack/common@0.34.0
  - @loopstack/contracts@0.34.0
  - @loopstack/core@0.34.0
  - @loopstack/auth@0.34.0

## 0.33.0

### Patch Changes

- Updated dependencies [[`fff422f`](https://github.com/loopstack-ai/loopstack/commit/fff422f6cad4cac05be9380af82fb470b5fd4c0b)]:
  - @loopstack/common@0.33.0
  - @loopstack/auth@0.33.0
  - @loopstack/core@0.33.0

## 0.32.3

### Patch Changes

- [#176](https://github.com/loopstack-ai/loopstack/pull/176) [`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Move framework dependencies (NestJS, rxjs, class-transformer, etc.) from dependencies to devDependencies + peerDependencies

- Updated dependencies [[`228d08b`](https://github.com/loopstack-ai/loopstack/commit/228d08b807915ecfa6ef8275714500750e797036), [`52cbb6f`](https://github.com/loopstack-ai/loopstack/commit/52cbb6fcb2c2ed9f15cd1a7498b208a54f8de3c8)]:
  - @loopstack/core@0.32.3
  - @loopstack/contracts@0.32.3
  - @loopstack/common@0.32.3
  - @loopstack/auth@0.32.3

## 0.32.0

### Minor Changes

- [#170](https://github.com/loopstack-ai/loopstack/pull/170) [`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - feat(framework): rework framework components and align with NestJs practices

### Patch Changes

- Updated dependencies [[`fc88357`](https://github.com/loopstack-ai/loopstack/commit/fc88357ecbf6bf83b61de8aa353fdba9b0f43f4c)]:
  - @loopstack/contracts@0.32.0
  - @loopstack/common@0.32.0
  - @loopstack/auth@0.32.0
  - @loopstack/core@0.32.0

## 0.31.0

### Minor Changes

- [#156](https://github.com/loopstack-ai/loopstack/pull/156) [`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Rename Workspace to App, restructure FrameworkContext (this.ctx), and add WorkflowRunner service

### Patch Changes

- Updated dependencies [[`95af173`](https://github.com/loopstack-ai/loopstack/commit/95af17340d4939896352c38a450398f2024e66a1)]:
  - @loopstack/contracts@0.31.0
  - @loopstack/common@0.31.0
  - @loopstack/core@0.31.0
  - @loopstack/auth@0.31.0

## 0.30.0

### Minor Changes

- [#147](https://github.com/loopstack-ai/loopstack/pull/147) [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Nodenext ts options

### Patch Changes

- Updated dependencies [[`6847dd4`](https://github.com/loopstack-ai/loopstack/commit/6847dd43d390b090388b2eddfc2ec50d8b4cc3c1), [`a220472`](https://github.com/loopstack-ai/loopstack/commit/a220472529f50ac5957f960787f742bdf57ab511), [`1d069d2`](https://github.com/loopstack-ai/loopstack/commit/1d069d2bd819e8eb9f427ab486a34defc12d971b)]:
  - @loopstack/core@0.30.0
  - @loopstack/auth@0.30.0
  - @loopstack/common@0.30.0
  - @loopstack/contracts@0.30.0

## 0.29.0

### Patch Changes

- Updated dependencies [[`4adc8f9`](https://github.com/loopstack-ai/loopstack/commit/4adc8f9e9b6b0b85787cea4d800cfe1142c421f3)]:
  - @loopstack/contracts@0.29.0
  - @loopstack/common@0.29.0
  - @loopstack/core@0.29.0
  - @loopstack/auth@0.29.0

## 0.28.0

### Patch Changes

- Updated dependencies [[`189e733`](https://github.com/loopstack-ai/loopstack/commit/189e733748074d015a41290ab45c7a46be92253c)]:
  - @loopstack/contracts@0.28.0
  - @loopstack/common@0.28.0
  - @loopstack/core@0.28.0
  - @loopstack/auth@0.28.0

## 0.27.0

### Patch Changes

- Updated dependencies [[`03f8e93`](https://github.com/loopstack-ai/loopstack/commit/03f8e93434ca35d4428206488275741d76cb25df), [`6bd6e28`](https://github.com/loopstack-ai/loopstack/commit/6bd6e283b2b3e7526d7e89397f7e5c9b73d73316)]:
  - @loopstack/contracts@0.27.0
  - @loopstack/auth@0.27.0
  - @loopstack/common@0.27.0
  - @loopstack/core@0.27.0

## 0.26.0

### Minor Changes

- [#129](https://github.com/loopstack-ai/loopstack/pull/129) [`bff1bfa`](https://github.com/loopstack-ai/loopstack/commit/bff1bfa3f8de0800c26537ce289f672493ec6c7c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Extract secrets functionality into dedicated registry module (@loopstack/secrets-module), removing secrets tools, services, entities, and documents from core, api, and common packages

### Patch Changes

- Updated dependencies [[`bff1bfa`](https://github.com/loopstack-ai/loopstack/commit/bff1bfa3f8de0800c26537ce289f672493ec6c7c)]:
  - @loopstack/core@0.26.0
  - @loopstack/common@0.26.0
  - @loopstack/auth@0.26.0

## 0.25.2

### Patch Changes

- [#124](https://github.com/loopstack-ai/loopstack/pull/124) [`598a7bc`](https://github.com/loopstack-ai/loopstack/commit/598a7bca418f5fdebb695c3ee56b2ea9c0cbdf22) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Revert deps

- Updated dependencies [[`598a7bc`](https://github.com/loopstack-ai/loopstack/commit/598a7bca418f5fdebb695c3ee56b2ea9c0cbdf22)]:
  - @loopstack/contracts@0.25.2
  - @loopstack/common@0.25.2
  - @loopstack/auth@0.25.2
  - @loopstack/core@0.25.2

## 0.25.1

### Patch Changes

- [#121](https://github.com/loopstack-ai/loopstack/pull/121) [`0de6c53`](https://github.com/loopstack-ai/loopstack/commit/0de6c53e23342987a0d2ae182a6c2c473657a71f) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Update dependencies

- Updated dependencies [[`0de6c53`](https://github.com/loopstack-ai/loopstack/commit/0de6c53e23342987a0d2ae182a6c2c473657a71f)]:
  - @loopstack/common@0.25.1
  - @loopstack/auth@0.25.1
  - @loopstack/core@0.25.1
  - @loopstack/contracts@0.25.1

## 0.25.0

### Minor Changes

- [#114](https://github.com/loopstack-ai/loopstack/pull/114) [`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Refactor UI schema from actions/form to unified widgets array and add transition-level state assignments

- [#114](https://github.com/loopstack-ai/loopstack/pull/114) [`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Migrate to workflow core v2

### Patch Changes

- Updated dependencies [[`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154), [`5d2eef9`](https://github.com/loopstack-ai/loopstack/commit/5d2eef948106deccd5ef706ec1c3fbce178d0154)]:
  - @loopstack/contracts@0.25.0
  - @loopstack/core@0.25.0
  - @loopstack/common@0.25.0
  - @loopstack/auth@0.25.0

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
  - @loopstack/core@0.24.0
  - @loopstack/common@0.24.0
  - @loopstack/contracts@0.24.0
  - @loopstack/auth@0.24.0

## 0.23.1

### Patch Changes

- [#106](https://github.com/loopstack-ai/loopstack/pull/106) [`8d9273e`](https://github.com/loopstack-ai/loopstack/commit/8d9273e5e08191682364c4b1282953e24a929f43) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add workspace UI action configuration and debug flag for workflow transitions

- Updated dependencies [[`8d9273e`](https://github.com/loopstack-ai/loopstack/commit/8d9273e5e08191682364c4b1282953e24a929f43), [`8d9273e`](https://github.com/loopstack-ai/loopstack/commit/8d9273e5e08191682364c4b1282953e24a929f43)]:
  - @loopstack/core@0.23.1
  - @loopstack/contracts@0.23.1

## 0.23.0

### Patch Changes

- [#98](https://github.com/loopstack-ai/loopstack/pull/98) [`4f88d3f`](https://github.com/loopstack-ai/loopstack/commit/4f88d3f5b9990b425e7dcb83f28c042b10881d29) Thanks [@jakobklippel](https://github.com/jakobklippel)! - add status filter and preview panel config, make form transition optional

- Updated dependencies [[`fe9516e`](https://github.com/loopstack-ai/loopstack/commit/fe9516e91fc5614bf540b918ac3abc1a74453167), [`4f88d3f`](https://github.com/loopstack-ai/loopstack/commit/4f88d3f5b9990b425e7dcb83f28c042b10881d29), [`07e62db`](https://github.com/loopstack-ai/loopstack/commit/07e62db4140f6c22c3fd4ecd6b88a32f82ffb0ed)]:
  - @loopstack/auth@0.23.0
  - @loopstack/contracts@0.23.0
  - @loopstack/common@0.23.0
  - @loopstack/core@0.23.0

## 0.22.2

### Patch Changes

- [#93](https://github.com/loopstack-ai/loopstack/pull/93) [`66f16db`](https://github.com/loopstack-ai/loopstack/commit/66f16db846c3a765ba2ca2d6206d3a17ac7e782b) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add workerId and workerUrl fields to workspace environment DTOs and entity

- Updated dependencies [[`66f16db`](https://github.com/loopstack-ai/loopstack/commit/66f16db846c3a765ba2ca2d6206d3a17ac7e782b)]:
  - @loopstack/common@0.22.2

## 0.22.0

### Minor Changes

- [#86](https://github.com/loopstack-ai/loopstack/pull/86) [`34f00b1`](https://github.com/loopstack-ai/loopstack/commit/34f00b18ed5d76745a0c73980964713136dc5c38) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add workspace environments and favourites feature

### Patch Changes

- Updated dependencies [[`34f00b1`](https://github.com/loopstack-ai/loopstack/commit/34f00b18ed5d76745a0c73980964713136dc5c38), [`2606b29`](https://github.com/loopstack-ai/loopstack/commit/2606b29d3bcf893f41b2d5e7d47fb1c5323e4135)]:
  - @loopstack/contracts@0.22.0
  - @loopstack/common@0.22.0
  - @loopstack/core@0.22.0
  - @loopstack/auth@0.22.0

## 0.21.0

### Minor Changes

- [#80](https://github.com/loopstack-ai/loopstack/pull/80) [`37df097`](https://github.com/loopstack-ai/loopstack/commit/37df0972404fc9601906619a7b64fa088395e0ee) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add remote auth via JWKS for hub authentication

### Patch Changes

- [#80](https://github.com/loopstack-ai/loopstack/pull/80) [`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Various security related updates

- Updated dependencies [[`65fbbee`](https://github.com/loopstack-ai/loopstack/commit/65fbbeef7bda3a328327adf0fa451052c4ce86ba), [`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1), [`37df097`](https://github.com/loopstack-ai/loopstack/commit/37df0972404fc9601906619a7b64fa088395e0ee)]:
  - @loopstack/common@0.21.0
  - @loopstack/core@0.21.0
  - @loopstack/contracts@0.21.0
  - @loopstack/auth@0.21.0

## 0.21.0-rc.0

### Minor Changes

- [#80](https://github.com/loopstack-ai/loopstack/pull/80) [`37df097`](https://github.com/loopstack-ai/loopstack/commit/37df0972404fc9601906619a7b64fa088395e0ee) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Add remote auth via JWKS for hub authentication

### Patch Changes

- [#80](https://github.com/loopstack-ai/loopstack/pull/80) [`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Various security related updates

- Updated dependencies [[`73fb724`](https://github.com/loopstack-ai/loopstack/commit/73fb72413231eb8502de143abdc6c840a38e12b1), [`37df097`](https://github.com/loopstack-ai/loopstack/commit/37df0972404fc9601906619a7b64fa088395e0ee)]:
  - @loopstack/contracts@0.21.0-rc.0
  - @loopstack/common@0.21.0-rc.0
  - @loopstack/auth@0.21.0-rc.0
  - @loopstack/core@0.21.0-rc.0

## 0.20.3

### Patch Changes

- [#75](https://github.com/loopstack-ai/loopstack/pull/75) [`e49ea39`](https://github.com/loopstack-ai/loopstack/commit/e49ea392fc736048f165e8dfaab79d97125ec77c) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Fix sub workflow execution flow and improve ui

- Updated dependencies [[`d14b367`](https://github.com/loopstack-ai/loopstack/commit/d14b36797f68201c1cc59c9d976ff83935e7aac8), [`e4945ab`](https://github.com/loopstack-ai/loopstack/commit/e4945ab0596cd074213923f38d1d8fe239fb6ceb), [`e49ea39`](https://github.com/loopstack-ai/loopstack/commit/e49ea392fc736048f165e8dfaab79d97125ec77c)]:
  - @loopstack/common@0.20.3
  - @loopstack/core@0.20.3
  - @loopstack/contracts@0.20.3

## 0.20.0

### Patch Changes

- Updated dependencies [[`fa32ec4`](https://github.com/loopstack-ai/loopstack/commit/fa32ec48d3b511586ff1e7746f1d63b72d7c5570)]:
  - @loopstack/contracts@0.20.0
  - @loopstack/common@0.20.0
  - @loopstack/core@0.20.0
  - @loopstack/auth@0.20.0

## 0.19.0

### Minor Changes

- [#44](https://github.com/loopstack-ai/loopstack/pull/44) [`b20801c`](https://github.com/loopstack-ai/loopstack/commit/b20801ce956557dbd2eae22ae02c8d45954f8bf8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Replace abstract block classes with interfaces, various bugfixes

### Patch Changes

- [#48](https://github.com/loopstack-ai/loopstack/pull/48) [`d505f2f`](https://github.com/loopstack-ai/loopstack/commit/d505f2f42bf06329b316e73819bc639a07a5e492) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Move loopstack cli info to package.json

- Updated dependencies [[`b20801c`](https://github.com/loopstack-ai/loopstack/commit/b20801ce956557dbd2eae22ae02c8d45954f8bf8), [`d505f2f`](https://github.com/loopstack-ai/loopstack/commit/d505f2f42bf06329b316e73819bc639a07a5e492)]:
  - @loopstack/contracts@0.19.0
  - @loopstack/common@0.19.0
  - @loopstack/auth@0.19.0
  - @loopstack/core@0.19.0

## 0.19.0-rc.1

### Patch Changes

- [#48](https://github.com/loopstack-ai/loopstack/pull/48) [`d505f2f`](https://github.com/loopstack-ai/loopstack/commit/d505f2f42bf06329b316e73819bc639a07a5e492) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Move loopstack cli info to package.json

- Updated dependencies [[`d505f2f`](https://github.com/loopstack-ai/loopstack/commit/d505f2f42bf06329b316e73819bc639a07a5e492)]:
  - @loopstack/contracts@0.19.0-rc.1
  - @loopstack/common@0.19.0-rc.1
  - @loopstack/auth@0.19.0-rc.1
  - @loopstack/core@0.19.0-rc.1

## 0.19.0-rc.0

### Minor Changes

- [#44](https://github.com/loopstack-ai/loopstack/pull/44) [`b20801c`](https://github.com/loopstack-ai/loopstack/commit/b20801ce956557dbd2eae22ae02c8d45954f8bf8) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Replace abstract block classes with interfaces, various bugfixes

### Patch Changes

- Updated dependencies [[`b20801c`](https://github.com/loopstack-ai/loopstack/commit/b20801ce956557dbd2eae22ae02c8d45954f8bf8)]:
  - @loopstack/contracts@0.19.0-rc.0
  - @loopstack/common@0.19.0-rc.0
  - @loopstack/auth@0.19.0-rc.0
  - @loopstack/core@0.19.0-rc.0

## 0.18.3

### Patch Changes

- [#34](https://github.com/loopstack-ai/loopstack/pull/34) [`2d23ceb`](https://github.com/loopstack-ai/loopstack/commit/2d23cebfad185b7320becf4d53be5d149136da40) Thanks [@TobeyTG](https://github.com/TobeyTG)! - added debug view

## 0.18.1

### Patch Changes

- Updated dependencies []:
  - @loopstack/contracts@0.18.1
  - @loopstack/common@0.18.1
  - @loopstack/core@0.18.1
  - @loopstack/auth@0.18.1

## 0.18.0

### Minor Changes

- [#8](https://github.com/loopstack-ai/loopstack/pull/8) [`3fd1db5`](https://github.com/loopstack-ai/loopstack/commit/3fd1db5d0de8ad26e3e22348f7f1593024a74273) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Test Release

### Patch Changes

- Updated dependencies [[`e556176`](https://github.com/loopstack-ai/loopstack/commit/e5561769b365218f1ffdc890b887e7b607d06101), [`3fd1db5`](https://github.com/loopstack-ai/loopstack/commit/3fd1db5d0de8ad26e3e22348f7f1593024a74273)]:
  - @loopstack/core@0.18.0
  - @loopstack/auth@0.18.0
  - @loopstack/common@0.18.0
  - @loopstack/contracts@0.18.0

## 0.18.0-rc.2

### Patch Changes

- Updated dependencies [[`e556176`](https://github.com/loopstack-ai/loopstack/commit/e5561769b365218f1ffdc890b887e7b607d06101)]:
  - @loopstack/core@0.18.0-rc.2
  - @loopstack/contracts@0.18.0-rc.2
  - @loopstack/common@0.18.0-rc.2
  - @loopstack/auth@0.18.0-rc.2

## 0.18.0-rc.1

### Patch Changes

- Updated dependencies []:
  - @loopstack/contracts@0.18.0-rc.1
  - @loopstack/common@0.18.0-rc.1
  - @loopstack/core@0.18.0-rc.1
  - @loopstack/auth@0.18.0-rc.1

## 0.18.0-rc.0

### Minor Changes

- [#8](https://github.com/loopstack-ai/loopstack/pull/8) [`3fd1db5`](https://github.com/loopstack-ai/loopstack/commit/3fd1db5d0de8ad26e3e22348f7f1593024a74273) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Test Release

### Patch Changes

- Updated dependencies [[`3fd1db5`](https://github.com/loopstack-ai/loopstack/commit/3fd1db5d0de8ad26e3e22348f7f1593024a74273)]:
  - @loopstack/core@0.18.0-rc.0
  - @loopstack/auth@0.18.0-rc.0
  - @loopstack/common@0.18.0-rc.0
  - @loopstack/contracts@0.18.0-rc.0
