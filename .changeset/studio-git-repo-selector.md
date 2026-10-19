---
'@loopstack/loopstack-studio': minor
---

The git panel addresses one repository of the workspace. It loads the repositories the application declared, picks the primary one, and shows a selector when there is more than one — a workspace that declares none keeps the panel it had, pointed at the root.

The chosen repository travels with every read, as the environment slot already did, and lives in the workbench layout beside it so the choice outlives closing the panel. The connect action names it too, since each repository has its own remote.
