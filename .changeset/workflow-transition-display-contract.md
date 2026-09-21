---
'@loopstack/contracts': minor
'@loopstack/common': minor
'@loopstack/api': minor
'@loopstack/loopstack-studio': minor
---

`WorkflowTransitionType` now describes the transition the engine actually serializes. **Breaking for
external consumers:** the type and its schema are `{ id, from, to, trigger?, guard? }` — `if`, `call`,
`assign`, `onError` and `debug` are gone, and a guard is reported by method name (`guard: 'needsAuth'`)
rather than as a string expression. `@loopstack/contracts/schemas` drops
`WorkflowTransitionConfigSchema`, `TemplateExpression`, `AssignmentSchema`, `AssignmentConfigSchema`,
`ToolCallSchema` and `ToolCallConfigSchema`; `@loopstack/contracts/types` drops `AssignmentType`,
`AssignmentConfigType` and `ToolCallType`. `WorkflowSchema` no longer carries `transitions` — the
`@Transition` / `@Guard` decorators are the only way to declare them, and `buildWorkflowTransitions` is
the only source the config endpoint reads. `WorkflowConfigDto.transitions` is now validated against the
real schema instead of an unchecked `z.custom`, and `DocumentConfigSchema`'s `tags` and `meta` fields
are typed as the concrete values the runtime already reads. Studio labels a guarded edge with its guard
method name.
