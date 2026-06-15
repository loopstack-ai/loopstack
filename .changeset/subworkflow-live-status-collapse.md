---
'@loopstack/loopstack-studio': patch
'@loopstack/api': minor
'@loopstack/contracts': minor
'@loopstack/core': minor
---

Slim `GET /workflows/:id/status` endpoint plus a `useWorkflowStatus` hook so Studio's embedded sub-workflow link cards react to live state without pulling the full workflow payload on every SSE tick. The link card now auto-collapses when its child reaches a terminal state, and its initial expanded value is deferred until the live status arrives — so waiting/running children stay expanded on reload, completed ones come back collapsed, and there is no expand-then-collapse flicker. `WORKFLOW_UPDATED` SSE messages now carry `parentId` so the parent's children-list cache is invalidated when a child transitions, which keeps the execution timeline, workflow list, and history list in sync with live child status.
