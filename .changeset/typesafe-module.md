---
'@loopstack/typesafe-module': minor
---

Add `@loopstack/typesafe-module` for typed decisions and classifications with TypeSafe AI (`jev` models).
`TypeSafeModule` provides the `typesafe_system_one` tool (`TypeSafeSystemOneTool`), which answers named yes/no
(`noul`), `choice` and `score` questions about a state and returns `{ model, answers, usage }`, with
`{ provider: 'typesafe', model, usage }` as metadata. `TypeSafeClientService` reads the API key from
`TYPESAFE_API_KEY` (override the env var name with `envApiKey`) and exposes `systemOne()` with answer types
inferred from your question labels. The package re-exports the SDK's `choice`, `noul` and `score` builders and
its error classes.

```ts
const { data } = await this.typesafe.call({
  state: 'I was charged twice.',
  questions: { category: choice('What is this ticket about?', { billing: null, other: null }) },
});
```
