---
'@loopstack/loopstack-studio': minor
'@loopstack/contracts': minor
'@loopstack/api': minor
'@loopstack/client': minor
---

The dashboard is the one place Studio lists workspaces, with search, filters and batch delete.

- `@loopstack/loopstack-studio`: the dashboard searches workspaces by title and app, and filters them by state
  (waiting for you, working, queued, idle), by app and to favourites — in the card view and the list view alike. The
  filters are saved per browser; clicking a workspace's app adds it to the filter. The list view is a table with the
  columns state, title, app, active run, active runs, started, created and favourite, sorted on the server by title,
  app, creation date or favourite when a column header is clicked, one page at a time. In it, workspaces can be
  selected and deleted together, and every row has the card's menu: run, open, edit, favourite, delete. The cards
  are dragged into an order of their own; a card dragged with a filter on keeps the saved place of every workspace
  the filter hides. `/workspaces` opens the dashboard;
  `WorkspacesPage`, `router.getWorkspaces()` and `router.navigateToWorkspaces()` are removed, and links that pointed
  there — the app launcher, the sidebar's favourites, the breadcrumbs — lead to the dashboard.
- `@loopstack/contracts` and `@loopstack/api`: the workspace filter takes several apps (`appName: ['a', 'b']`) and an
  `activity` — one state or several — computed from the workspace's runs by the rule the dashboard colours its cards
  with: a run waiting on a person, then one being worked on, then one queued, otherwise `idle`.
- `@loopstack/client`: `workflow.created` and `workflow.updated` also stale the workspace lists, so a list filtered by
  state follows its runs.
