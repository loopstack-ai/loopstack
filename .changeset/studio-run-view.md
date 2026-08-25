---
'@loopstack/loopstack-studio': minor
---

Run View — a run rendered the way the CLI follows it, entirely on the canonical `@loopstack/contracts/park-view` rules: a chronological, depth-indented transcript over the whole run tree (link-document visibility, re-saves shown as honest output) with the one canonical prompt pinned at the bottom, no iframes. A view toggle in the workbench header switches the workflow area between the legacy document tree and the run view (persisted studio preference, default classic); `/runs/:workflowId` hosts the same view standalone. Interactive prompts (`text-prompt`, `confirm-prompt`, `choices`, `form`, `prompt-input`, `button`) are run-view-native components in the view's own widget registry; unregistered input widgets (`secret-input`, `oauth-prompt`) show an inert not-supported card and are answered in the classic view for now.
