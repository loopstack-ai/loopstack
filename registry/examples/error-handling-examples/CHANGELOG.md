# @loopstack/error-handling-examples

## 0.1.1

### Patch Changes

- [#406](https://github.com/loopstack-ai/loopstack/pull/406) [`e90bc78`](https://github.com/loopstack-ai/loopstack/commit/e90bc78117b0f9384ab209e68249bb707e0c40a5) Thanks [@jakobklippel](https://github.com/jakobklippel)! - The error handling examples have their own package, with one workflow per error mode.
  - `@loopstack/error-handling-examples` (`ErrorHandlingExamplesModule`, Studio app "Error Handling Examples"):
    `auto_retry_example`, `retry_target_example`, `error_place_example`, `manual_retry_example`,
    `transition_timeout_example` and `sub_workflow_error_place_example`, titled "Error Handling - … Example". Each
    workflow has a spec.
  - `@loopstack/advanced-workflows-examples` no longer contains the error retry example: `ErrorRetryWorkflow`
    (`error_retry`) and its tools are removed. Use `@loopstack/error-handling-examples` instead.

- Updated dependencies [[`3e27fd4`](https://github.com/loopstack-ai/loopstack/commit/3e27fd40a0e20fe2f97d37a7f8f73cb2cda1b193), [`8bc5176`](https://github.com/loopstack-ai/loopstack/commit/8bc5176a199b9272607a4fa5b2ddbd3f918bf51c), [`fc71cf0`](https://github.com/loopstack-ai/loopstack/commit/fc71cf018ff239527e8cfa251c73cd810cbd24bc), [`23347f3`](https://github.com/loopstack-ai/loopstack/commit/23347f394eb5a701f6af6bfb15af4bb81273e204), [`7fbd978`](https://github.com/loopstack-ai/loopstack/commit/7fbd9781224568dc1d93fa007a905b8f5cea6700), [`469f01c`](https://github.com/loopstack-ai/loopstack/commit/469f01c6f4519504ae0ca5a18f881439a55824fc), [`033d585`](https://github.com/loopstack-ai/loopstack/commit/033d585a128494abfb568ba3e3d923a58f2e7c6d), [`a6d9846`](https://github.com/loopstack-ai/loopstack/commit/a6d9846e8b2dc9634092fab97fb164b737a0fcb9)]:
  - @loopstack/common@0.44.0
