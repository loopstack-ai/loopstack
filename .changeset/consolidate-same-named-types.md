---
'@loopstack/contracts': minor
'@loopstack/common': minor
'@loopstack/api': minor
---

Give every shared type name a single meaning. `@loopstack/contracts` is the source for types shared with the
frontend; `@loopstack/common` re-exports them.

- `@loopstack/contracts/api`: the `GET config/tools` response schema is `ToolConfigItemSchema` /
  `ToolConfigItemInterface`. `ToolConfigSchema` names only the tool block config in
  `@loopstack/contracts/schemas`.
- `@loopstack/contracts/api`: the persisted document record is `DocumentItemSchema` / `DocumentItemInterface`.
  `DocumentSchema` names only the document shape in `@loopstack/contracts/schemas`.
- `@loopstack/contracts/types`: `WorkflowStateType` is removed; use the `WorkflowState` enum from
  `@loopstack/contracts/enums`.
- `@loopstack/common`: `UserTypeEnum`, `StudioUiConfig` and `StudioWidgetConfig` are re-exported from
  `@loopstack/contracts`.
- `@loopstack/common`: the transition on `WorkflowPayload` is typed `TransitionRequest` (`{ id, payload? }`),
  distinct from the queued `TransitionPayload` in `@loopstack/contracts`.
- `@loopstack/api`: `AuthConfig` is removed; the auth config type is `AuthConfig` from `@loopstack/auth`.
