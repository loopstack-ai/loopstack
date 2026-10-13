---
'@loopstack/common': patch
'@loopstack/api': patch
---

The workspace list's activity filter and the run list no longer read the whole run table on every request.

- `@loopstack/common`: `core_workflow` is indexed on `(workspace_id, status)` and `(parent_id, status)`. A synchronized
  schema creates both indexes on the next boot.
- `@loopstack/api`: the run list counts the active children of the runs on its page only, not of every run.
