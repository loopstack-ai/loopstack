import { Module } from '@nestjs/common';
import { GitModule } from '@loopstack/git';
import { GitHubModule } from '@loopstack/github';
import { HitlModule } from '@loopstack/hitl';
import { OAuthModule } from '@loopstack/oauth';
import { ConnectGitHubWorkflow } from './workflows/connect-github/connect-github.workflow.js';

/**
 * NestJS module that provides `ConnectGitHubWorkflow` — a guided end-to-end workflow that authenticates via
 * OAuth, creates or links a GitHub repo, configures git remotes, resolves branch divergence via HITL, and pushes.
 *
 * Registration:
 * - `GitHubIntegrationModule` — bare import; it internally imports `GitModule`, `GitHubModule`, `HitlModule`,
 *   and `OAuthModule`, so you do not import those yourself. No static configuration methods exist.
 *
 * Requires: the peer packages `@loopstack/git`, `@loopstack/github`, `@loopstack/hitl`,
 * `@loopstack/oauth`, and `@loopstack/remote-client` must be installed, plus a configured GitHub OAuth app
 * (client ID/secret via `GitHubModule`'s env vars) and the `RemoteClient` infrastructure required by `GitModule`.
 *
 * @public
 */
@Module({
  imports: [GitModule, GitHubModule, HitlModule, OAuthModule],
  providers: [ConnectGitHubWorkflow],
  exports: [ConnectGitHubWorkflow],
})
export class GitHubIntegrationModule {}
