import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { GitModule } from '@loopstack/git-module';
import { GitHubIntegrationModule } from '@loopstack/github-integration';
import { RemoteClientModule } from '@loopstack/remote-client';
import { GitCommitFlowExampleWorkflow } from './workflows/git-commit-flow/git-commit-flow-example.workflow';
import { GithubRepoSyncExampleWorkflow } from './workflows/github-repo-sync/github-repo-sync-example.workflow';

const WORKFLOWS = [GitCommitFlowExampleWorkflow, GithubRepoSyncExampleWorkflow];

@StudioApp({
  title: 'Git Examples',
  workflows: WORKFLOWS,
})
@Module({
  imports: [
    GitModule.forFeature(),
    GitHubIntegrationModule,
    RemoteClientModule.forFeature({ slots: [{ id: 'sandbox', type: 'sandbox', title: 'Sandbox' }] }),
  ],
  providers: WORKFLOWS,
  exports: WORKFLOWS,
})
export class GitExamplesModule {}
