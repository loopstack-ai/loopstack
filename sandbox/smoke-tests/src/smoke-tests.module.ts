import { Module } from '@nestjs/common';
import { AdvancedWorkflowsExamplesModule } from '@loopstack/advanced-workflows-examples';
import { AgentExamplesModule } from '@loopstack/agent-examples';
import { ErrorHandlingExamplesModule } from '@loopstack/error-handling-examples';
import { GitExamplesModule } from '@loopstack/git-examples';
import { GitHubExamplesModule } from '@loopstack/github-examples';
import { GoogleWorkspaceExamplesModule } from '@loopstack/google-workspace-examples';
import { HitlExamplesModule } from '@loopstack/hitl-examples';
import { IntegrationExamplesModule } from '@loopstack/integration-examples';
import { LlmExamplesModule } from '@loopstack/llm-examples';
import { LocalFileExplorerExamplesModule } from '@loopstack/local-file-explorer-examples';
import { ObservabilityExamplesModule } from '@loopstack/observability-examples';
import { RemoteClientExamplesModule } from '@loopstack/remote-client-examples';
import { SandboxExamplesModule } from '@loopstack/sandbox-examples';
import { SchedulingExamplesModule } from '@loopstack/scheduling-examples';
import { SecretsExamplesModule } from '@loopstack/secrets-examples';
import { TestingExamplesModule } from '@loopstack/testing-examples';
import { SmokeTestsController } from './smoke-tests.controller';

@Module({
  imports: [
    LlmExamplesModule,
    AgentExamplesModule,
    HitlExamplesModule,
    GitHubExamplesModule,
    GoogleWorkspaceExamplesModule,
    GitExamplesModule,
    SecretsExamplesModule,
    SandboxExamplesModule,
    RemoteClientExamplesModule,
    LocalFileExplorerExamplesModule,
    ObservabilityExamplesModule,
    AdvancedWorkflowsExamplesModule,
    ErrorHandlingExamplesModule,

    SchedulingExamplesModule,
    TestingExamplesModule,
    IntegrationExamplesModule,
  ],
  controllers: [SmokeTestsController],
})
export class SmokeTestsModule {}
