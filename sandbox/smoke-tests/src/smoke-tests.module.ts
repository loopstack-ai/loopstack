import { Module } from '@nestjs/common';
import { AdvancedWorkflowsExamplesModule } from '@loopstack/advanced-workflows-examples';
import { AgentExamplesModule } from '@loopstack/agent-examples';
import { FilesystemExamplesModule } from '@loopstack/filesystem-examples';
import { GitExamplesModule } from '@loopstack/git-examples';
import { HitlExamplesModule } from '@loopstack/hitl-examples';
import { IntegrationExamplesModule } from '@loopstack/integration-examples';
import { LlmExamplesModule } from '@loopstack/llm-examples';
import { OAuthExamplesModule } from '@loopstack/oauth-examples';
import { ObservabilityExamplesModule } from '@loopstack/observability-examples';
import { RemoteClientModule } from '@loopstack/remote-client';
import { SchedulingExamplesModule } from '@loopstack/scheduling-examples';
import { SecretsExamplesModule } from '@loopstack/secrets-examples';
import { TestingExamplesModule } from '@loopstack/testing-examples';
import { SmokeTestsController } from './smoke-tests.controller';

@Module({
  imports: [
    RemoteClientModule.forFeature({ slots: [{ id: 'sandbox', type: 'sandbox', title: 'Sandbox' }] }),

    LlmExamplesModule,
    AgentExamplesModule,
    HitlExamplesModule,
    OAuthExamplesModule,
    GitExamplesModule,
    SecretsExamplesModule,
    FilesystemExamplesModule,
    ObservabilityExamplesModule,
    AdvancedWorkflowsExamplesModule,

    SchedulingExamplesModule,
    TestingExamplesModule,
    IntegrationExamplesModule,
  ],
  controllers: [SmokeTestsController],
})
export class SmokeTestsModule {}
