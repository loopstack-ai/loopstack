# @loopstack/google-workspace-examples

## 0.1.1

### Patch Changes

- [#392](https://github.com/loopstack-ai/loopstack/pull/392) [`33d211b`](https://github.com/loopstack-ai/loopstack/commit/33d211bb54de8826c7dc742bb5a797c28920daea) Thanks [@jakobklippel](https://github.com/jakobklippel)! - `github_overview_example` and `google_calendar_summary_example` end `failed` when sign-in fails.
  - When the `oauth` sub-workflow fails or is canceled (for example because the provider's client ID is not
    configured), the run moves to `auth_failed` and reports the sub-workflow's error message.
  - From `auth_failed`, the `retryAuth` transition starts over from `start`. A successful sign-in still retries
    from `start` straight away.

- [#392](https://github.com/loopstack-ai/loopstack/pull/392) [`33d211b`](https://github.com/loopstack-ai/loopstack/commit/33d211bb54de8826c7dc742bb5a797c28920daea) Thanks [@jakobklippel](https://github.com/jakobklippel)! - GitHub and Google Workspace examples each have their own package.
  - `@loopstack/github-examples` (`GitHubExamplesModule`, Studio app "GitHub Examples"): `github_overview_example` and
    `github_agent_example`, titled "GitHub - Overview Example" and "GitHub - Agent Example".
  - `@loopstack/google-workspace-examples` (`GoogleWorkspaceExamplesModule`, Studio app "Google Workspace Examples"):
    `google_calendar_summary_example` and `google_workspace_agent_example`, titled "Google Workspace - Calendar
    Summary Example" and "Google Workspace - Agent Example".

- Updated dependencies [[`1097b0b`](https://github.com/loopstack-ai/loopstack/commit/1097b0bb92539ca6a3a97be27861cdbc31a8bdc5), [`3e27fd4`](https://github.com/loopstack-ai/loopstack/commit/3e27fd40a0e20fe2f97d37a7f8f73cb2cda1b193), [`8bc5176`](https://github.com/loopstack-ai/loopstack/commit/8bc5176a199b9272607a4fa5b2ddbd3f918bf51c), [`e3c016e`](https://github.com/loopstack-ai/loopstack/commit/e3c016e73ed24178ec0a73b660fb496a787b3afe), [`aab81a6`](https://github.com/loopstack-ai/loopstack/commit/aab81a67c5f8fd6b301b5cd678aa0dee87501ace), [`6b06ebc`](https://github.com/loopstack-ai/loopstack/commit/6b06ebc27c2bf9a4897e505c994cdc4974669f76), [`fc71cf0`](https://github.com/loopstack-ai/loopstack/commit/fc71cf018ff239527e8cfa251c73cd810cbd24bc), [`23347f3`](https://github.com/loopstack-ai/loopstack/commit/23347f394eb5a701f6af6bfb15af4bb81273e204), [`0c73301`](https://github.com/loopstack-ai/loopstack/commit/0c73301b72f7ff84fe622710543965d9e51f2855), [`04b54cf`](https://github.com/loopstack-ai/loopstack/commit/04b54cf47024fdfe5e5d86fdfa1930c919791f13), [`7fbd978`](https://github.com/loopstack-ai/loopstack/commit/7fbd9781224568dc1d93fa007a905b8f5cea6700), [`469f01c`](https://github.com/loopstack-ai/loopstack/commit/469f01c6f4519504ae0ca5a18f881439a55824fc), [`369767e`](https://github.com/loopstack-ai/loopstack/commit/369767e035baebb2878d8b2877031216e77d969b), [`033d585`](https://github.com/loopstack-ai/loopstack/commit/033d585a128494abfb568ba3e3d923a58f2e7c6d), [`a6d9846`](https://github.com/loopstack-ai/loopstack/commit/a6d9846e8b2dc9634092fab97fb164b737a0fcb9)]:
  - @loopstack/claude-module@0.28.0
  - @loopstack/common@0.44.0
  - @loopstack/google-workspace-module@0.5.5
  - @loopstack/oauth-module@0.5.6
  - @loopstack/llm-provider-module@0.11.0
