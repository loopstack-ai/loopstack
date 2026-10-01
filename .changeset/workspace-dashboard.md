---
'@loopstack/loopstack-studio': minor
'@loopstack/contracts': minor
'@loopstack/client': minor
'@loopstack/react': major
'@loopstack/api': minor
'@loopstack/cli': minor
---

A dashboard that says what every workspace is doing right now.

Studio's landing page is a board with one card per workspace — the run it is on, the `place` that run is
parked or working at, and how old the run is — so "where is everyone, who is free, who is waiting on me" is
one glance rather than a tour of workspace pages. Runs waiting on a person are pulled into a strip at the
top, longest wait first; each entry opens that run in the workbench in a new tab, so the board stays put.
Cards keep their position when state changes and can be dragged into any order, saved per browser.

- `@loopstack/loopstack-studio`: the board at `/dashboard` (`getDashboard()`), with the app launcher moving
  to `/applications` (`getApplications()`). A workspace is `waiting | working | queued | idle`, where
  `waiting` means waiting on a *person* — a run parked on its own children is still working. The runs list
  gains multi-select filters for status, workspace and workflow, and `getRunsActionRequired()` is gone with
  the page it addressed, which filtered a `paused` state the engine never assigns.
- `@loopstack/contracts` and `@loopstack/api`: any workflow column filter takes one value or several —
  `status: ['running', 'waiting']` reads as SQL `IN` — and `workflowName` joins the filter schema, which had
  been silently dropped from every request that sent it.
- `@loopstack/cli`: `loopstack runs --status waiting,failed` filters on several states.
- `@loopstack/client` and `@loopstack/react`: the unused dashboard-statistics endpoint and its SDK surface
  (`client.dashboard`, `queries.dashboardStats`, `useDashboardStats`) are removed; per-workspace rows answer
  the question those counters did not.
