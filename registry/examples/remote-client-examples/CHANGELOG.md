# @loopstack/remote-client-examples

## 0.1.1

### Patch Changes

- [#400](https://github.com/loopstack-ai/loopstack/pull/400) [`18fab10`](https://github.com/loopstack-ai/loopstack/commit/18fab10a1a8a14650cbbe1efe9df45cbf523f1a4) Thanks [@jakobklippel](https://github.com/jakobklippel)! - The sandbox, remote client and local file explorer examples each have their own package, so each one boots with only
  the infrastructure it uses.
  - `@loopstack/sandbox-examples` (`SandboxExamplesModule`, Studio app "Sandbox Examples"): `sandbox_example`, titled
    "Sandbox - Filesystem Example". Needs Docker at run time.
  - `@loopstack/remote-client-examples` (`RemoteClientExamplesModule`, Studio app "Remote Client Examples"):
    `remote_client_example` and `remote_file_explorer_example`, titled "Remote Client - Command Example" and "Remote
    Client - File Explorer Example". Needs the `RemoteClientModule` root and a remote agent.
  - `@loopstack/local-file-explorer-examples` (`LocalFileExplorerExamplesModule`, Studio app "Local File Explorer
    Examples"): `local_file_explorer_example`, titled "Local File Explorer - File Tree Example". Needs nothing beyond
    the local disk.

- Updated dependencies [[`3e27fd4`](https://github.com/loopstack-ai/loopstack/commit/3e27fd40a0e20fe2f97d37a7f8f73cb2cda1b193), [`8bc5176`](https://github.com/loopstack-ai/loopstack/commit/8bc5176a199b9272607a4fa5b2ddbd3f918bf51c), [`fc71cf0`](https://github.com/loopstack-ai/loopstack/commit/fc71cf018ff239527e8cfa251c73cd810cbd24bc), [`23347f3`](https://github.com/loopstack-ai/loopstack/commit/23347f394eb5a701f6af6bfb15af4bb81273e204), [`1653b4e`](https://github.com/loopstack-ai/loopstack/commit/1653b4ecdedba892f08f58b75f5e8c63bcc155bf), [`7fbd978`](https://github.com/loopstack-ai/loopstack/commit/7fbd9781224568dc1d93fa007a905b8f5cea6700), [`469f01c`](https://github.com/loopstack-ai/loopstack/commit/469f01c6f4519504ae0ca5a18f881439a55824fc), [`033d585`](https://github.com/loopstack-ai/loopstack/commit/033d585a128494abfb568ba3e3d923a58f2e7c6d), [`a6d9846`](https://github.com/loopstack-ai/loopstack/commit/a6d9846e8b2dc9634092fab97fb164b737a0fcb9)]:
  - @loopstack/common@0.44.0
  - @loopstack/remote-client@0.29.0
  - @loopstack/remote-file-explorer-module@0.27.2
