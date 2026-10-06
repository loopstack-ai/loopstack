---
'@loopstack/sandbox-examples': patch
'@loopstack/remote-client-examples': patch
'@loopstack/local-file-explorer-examples': patch
---

The sandbox, remote client and local file explorer examples each have their own package, so each one boots with only
the infrastructure it uses.

- `@loopstack/sandbox-examples` (`SandboxExamplesModule`, Studio app "Sandbox Examples"): `sandbox_example`, titled
  "Sandbox - Filesystem Example". Needs Docker at run time.
- `@loopstack/remote-client-examples` (`RemoteClientExamplesModule`, Studio app "Remote Client Examples"):
  `remote_client_example` and `remote_file_explorer_example`, titled "Remote Client - Command Example" and "Remote
  Client - File Explorer Example". Needs the `RemoteClientModule` root and a remote agent.
- `@loopstack/local-file-explorer-examples` (`LocalFileExplorerExamplesModule`, Studio app "Local File Explorer
  Examples"): `local_file_explorer_example`, titled "Local File Explorer - File Tree Example". Needs nothing beyond
  the local disk.
