# @loopstack/github-oauth-example

## 0.1.1

### Patch Changes

- [#109](https://github.com/loopstack-ai/loopstack/pull/109) [`f002e07`](https://github.com/loopstack-ai/loopstack/commit/f002e07c1fb9727e25d09507ebef44219188eb2d) Thanks [@jakobklippel](https://github.com/jakobklippel)! - Migrate OAuth examples to claude-module and add authentication task tools
  - Replace ai-module with claude-module across GitHub and Google OAuth examples
  - Add authenticate-github-task and authenticate-google-task tools for automatic OAuth handling
  - Update agent workflows with explicit authentication instructions and error detection
  - Refactor message format from parts array to Claude content structure

- Updated dependencies [[`79fb4f7`](https://github.com/loopstack-ai/loopstack/commit/79fb4f781b9742bd45edc38340adc67511d6cfb8), [`79fb4f7`](https://github.com/loopstack-ai/loopstack/commit/79fb4f781b9742bd45edc38340adc67511d6cfb8)]:
  - @loopstack/core@0.24.0
  - @loopstack/common@0.24.0
  - @loopstack/claude-module@0.21.1
  - @loopstack/oauth-module@0.1.6
  - @loopstack/create-chat-message-tool@0.20.7
