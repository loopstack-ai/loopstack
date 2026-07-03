---
'@loopstack/client': minor
'@loopstack/contracts': patch
---

Introduce `@loopstack/client` — a headless, React-free TypeScript SDK for the Loopstack REST API. `createClient({ url, token })` provides typed fetchers for workflows, documents, and the processor, normalized `LoopstackApiError`s, JSON-encoded filter/sort query serialization, and environment-scoped `{ queryKey, queryFn }` descriptors the host application's QueryClient can consume. Runs in bare Node (enforced by a CI check) with no runtime dependencies beyond `@loopstack/contracts`. Also fixes `DocumentFilterSchema` to include the `isInvalidated` flag the documents list filter relies on.
