import { Module } from '@nestjs/common';
import { AgentExamplesModule } from '@loopstack/agent-examples';
import { DocumentsExamplesModule } from '@loopstack/documents-examples';
import { ErrorHandlingExamplesModule } from '@loopstack/error-handling-examples';
import { FilesystemExamplesModule } from '@loopstack/filesystem-examples';
import { GitExamplesModule } from '@loopstack/git-examples';
import { HitlExamplesModule } from '@loopstack/hitl-examples';
import { IntegrationExamplesModule } from '@loopstack/integration-examples';
import { LlmExamplesModule } from '@loopstack/llm-examples';
import { ModuleConfigExamplesModule } from '@loopstack/module-config-examples';
import { OAuthExamplesModule } from '@loopstack/oauth-examples';
import { ObservabilityExamplesModule } from '@loopstack/observability-examples';
import { SchedulingExamplesModule } from '@loopstack/scheduling-examples';
import { SecretsExamplesModule } from '@loopstack/secrets-examples';
import { StateManagementExamplesModule } from '@loopstack/state-management-examples';
import { SubWorkflowExamplesModule } from '@loopstack/sub-workflow-examples';
import { TestingExamplesModule } from '@loopstack/testing-examples';
import { ToolAuthoringExamplesModule } from '@loopstack/tool-authoring-examples';
import { TransitionsExamplesModule } from '@loopstack/transitions-examples';
import { SmokeTestsController } from './smoke-tests.controller';

@Module({
  imports: [
    LlmExamplesModule,
    AgentExamplesModule,
    HitlExamplesModule,
    OAuthExamplesModule,
    GitExamplesModule,
    SecretsExamplesModule,
    FilesystemExamplesModule,
    ObservabilityExamplesModule,

    StateManagementExamplesModule,
    TransitionsExamplesModule,
    ErrorHandlingExamplesModule,
    SubWorkflowExamplesModule,
    ToolAuthoringExamplesModule,
    DocumentsExamplesModule,
    ModuleConfigExamplesModule,

    SchedulingExamplesModule,
    TestingExamplesModule,
    IntegrationExamplesModule,
  ],
  controllers: [SmokeTestsController],
})
export class SmokeTestsModule {}
