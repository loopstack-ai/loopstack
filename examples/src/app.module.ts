import { Module } from '@nestjs/common';
import { AgentModule } from '@loopstack/agent';
import { ClaudeModule } from '@loopstack/claude-module';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { LoopstackModule } from '@loopstack/loopstack-module';
import { RemoteClientModule } from '@loopstack/remote-client';
import { SecretsModule } from '@loopstack/secrets-module';
import { AdvancedWorkflowsExamplesModule } from './advanced-workflows/advanced-workflows-examples.module';
import { AgentExamplesModule } from './agent/agent-examples.module';
import { ErrorHandlingExamplesModule } from './error-handling/error-handling-examples.module';
import { ExamplesController } from './examples.controller';
import { GitExamplesModule } from './git/git-examples.module';
import { GitHubExamplesModule } from './github/github-examples.module';
import { GoogleWorkspaceExamplesModule } from './google-workspace/google-workspace-examples.module';
import { HitlExamplesModule } from './hitl/hitl-examples.module';
import { IntegrationExamplesModule } from './integrations/integration-examples.module';
import { LlmExamplesModule } from './llm/llm-examples.module';
import { LocalFileExplorerExamplesModule } from './local-file-explorer/local-file-explorer-examples.module';
import { ObservabilityExamplesModule } from './observability/observability-examples.module';
import { RemoteClientExamplesModule } from './remote-client/remote-client-examples.module';
import { SandboxExamplesModule } from './sandbox/sandbox-examples.module';
import { SchedulingExamplesModule } from './scheduling/scheduling-examples.module';
import { SecretsExamplesModule } from './secrets/secrets-examples.module';
import { TestingExamplesModule } from './testing/testing-examples.module';

@Module({
  imports: [
    LoopstackModule.forRoot(),
    RemoteClientModule.forRoot({
      environments: {
        available: [
          {
            type: 'sandbox',
            name: 'Local Remote Server',
            connectionUrl: process.env.SANDBOX_URL ?? 'http://localhost:3080',
            agentUrl: process.env.SANDBOX_AGENT_URL ?? 'http://localhost:3031',
            local: true,
          },
        ],
      },
    }),
    ClaudeModule,
    LlmProviderModule.forRoot({ model: 'claude-sonnet-4-5' }),
    AgentModule,
    SecretsModule,

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
  controllers: [ExamplesController],
})
export class AppModule {}
