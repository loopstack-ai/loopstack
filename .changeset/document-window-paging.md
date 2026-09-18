---
'@loopstack/contracts': minor
'@loopstack/api': minor
'@loopstack/client': minor
'@loopstack/react': minor
'@loopstack/loopstack-studio': minor
---

Load a run's documents as a window of its newest messages, keep it current from the event stream, and fetch
older history on demand — so long runs keep updating instead of freezing at the start of the run.

A run's document list is unbounded, but it was fetched as a single unpaginated request: the server applied
its default limit (100) to an `index ASC` query, so a client always received the *oldest* 100 documents and
every later message fell outside the response. Each `document.created` event still triggered a refetch — of
the same first page — which looked exactly like live updates having stopped.

- `@loopstack/contracts`: `DocumentFilterSchema` gains the range filters `updatedAfter` (documents written
  after an instant — new and re-saved alike) and `beforeIndex` (documents ordered before an index).
- `@loopstack/api`: the document filter honors both, and list limits are capped by `DOCUMENT_MAX_LIMIT`
  (default 500) so one request cannot read an unbounded list.
- `@loopstack/client`: `queries.documents(workflowId, scope?)` now resolves to a `DocumentWindow`
  (`{ documents, total }`) holding the newest `DOCUMENT_WINDOW_SIZE` (200) documents in display order, with
  `scope: 'current' | 'all'` selecting whether re-saved documents are included (the cache key carries it).
  New `fetchDocumentsSince`/`fetchDocumentsBefore` helpers fetch the live delta and the previous page.
  `document.created` no longer resolves to a cache invalidation.
- `@loopstack/react`: new `useLiveDocuments()` — mount it alongside `useLiveInvalidation()` — merges the
  documents written since a cached window's newest row into that window by id, covering new and re-saved
  documents. `useWorkflowDocuments(workflowId, scope?)` returns
  `{ documents, total, hasOlder, loadOlder, isLoadingOlder, isLoading, isSuccess, error }`.
- `@loopstack/loopstack-studio`: the run view opens on the newest messages and offers a "Load older messages"
  button that prepends the previous page while holding the read position; the transcript view uses the shared
  window query and loses its own 500-document ceiling.
