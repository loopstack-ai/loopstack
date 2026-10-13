---
'@loopstack/code-workspace': minor
---

A workspace has one checkout, created by the first run that needs it and used as it is by every later run in that
workspace. Containers and dind volumes belong to the run that started them.

- `CodeWorkspaceProvisioner` addresses a checkout by `workspaceId` alone: `ensureCheckout`, `checkoutExists`,
  `resolveCheckoutDir`, `cloneBase`, `linkArtifacts`, `listRepos`, `resolveRepoDir`, `writeRepoGitHook`,
  `setRepoIdentity`, `applyFixtures`, `listChangedFiles`, `repoHead`, `countRepoChangesSinceBase` and `diffSinceBase`
  take no `workflowId`. `ensureCheckout` returns a `Checkout`; no per-run branch is checked out.
- `WorkspaceStateInfo.checkout` is the workspace's one `CheckoutInfo`, when it has one.
- Reclamation: the cleanup listener acts on `workspace.deleted` only; a run owns no files. `removeWorkflowContainers`
  and `removeWorkflowVolumes` release a run's containers and volumes, and the orphan plan lists containers and volumes
  of deleted runs beside workspace state whose row is gone.
