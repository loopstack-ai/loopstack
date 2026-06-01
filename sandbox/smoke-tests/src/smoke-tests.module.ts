import { Module } from '@nestjs/common';
import { ToolResultsExampleModule } from '@loopstack/accessing-tool-results-example-workflow';
import { AgentExampleModule } from '@loopstack/agent-example-workflow';
import { ChatExampleModule } from '@loopstack/chat-example-workflow';
import { CodeAgentExampleModule } from '@loopstack/code-agent-example-workflow';
import { StudioApp } from '@loopstack/common';
import { CustomToolModule } from '@loopstack/custom-tool-example-module';
import { DelegateErrorExampleModule } from '@loopstack/delegate-error-example-workflow';
import { DynamicRoutingExampleModule } from '@loopstack/dynamic-routing-example-workflow';
import { ErrorRetryExampleModule } from '@loopstack/error-retry-example-workflow';
import { GitCommitFlowExampleModule } from '@loopstack/git-commit-flow-example-workflow';
import { GitHubExampleModule } from '@loopstack/github-oauth-example';
import { GoogleExampleModule } from '@loopstack/google-oauth-example';
import { HitlAskUserExampleModule } from '@loopstack/hitl-ask-user-example-workflow';
import { HitlConfirmExampleModule } from '@loopstack/hitl-confirm-example-workflow';
import { LlmMultiProviderExampleModule } from '@loopstack/llm-multi-provider-example-workflow';
import { McpLinearExampleModule } from '@loopstack/mcp-linear-example-workflow';
import { MeetingNotesExampleModule } from '@loopstack/meeting-notes-example-workflow';
import { ModuleConfigExampleModule } from '@loopstack/module-config-example';
import { PromptExampleModule } from '@loopstack/prompt-example-workflow';
import { PromptStructuredOutputExampleModule } from '@loopstack/prompt-structured-output-example-workflow';
import { RemoteFileExplorerExampleModule } from '@loopstack/remote-file-explorer-example-workflow';
import { RunSubWorkflowExampleModule } from '@loopstack/run-sub-workflow-example';
import { SandboxExampleModule } from '@loopstack/sandbox-example-workflow';
import { SecretsExampleModule } from '@loopstack/secrets-example-workflow';
import { TestUiDocumentsExampleModule } from '@loopstack/test-ui-documents-example-workflow';
import { ToolCallingExampleModule } from '@loopstack/tool-call-example-workflow';
import { WorkflowStateExampleModule } from '@loopstack/workflow-state-example-workflow';
import { SmokeTestsController } from './smoke-tests.controller';

@StudioApp({ title: 'Smoke Tests' })
@Module({
  imports: [
    // Basic workflows (no external deps)
    ToolResultsExampleModule,
    CustomToolModule,
    DynamicRoutingExampleModule,
    ErrorRetryExampleModule,
    RunSubWorkflowExampleModule,
    TestUiDocumentsExampleModule,
    WorkflowStateExampleModule,

    // LLM workflows (need Claude/LLM provider)
    AgentExampleModule,
    ChatExampleModule,
    CodeAgentExampleModule,
    DelegateErrorExampleModule,
    MeetingNotesExampleModule,
    PromptExampleModule,
    PromptStructuredOutputExampleModule,
    ToolCallingExampleModule,
    LlmMultiProviderExampleModule,

    // HITL workflows
    HitlAskUserExampleModule,
    HitlConfirmExampleModule,

    // Module config
    ModuleConfigExampleModule,

    // External service workflows (need OAuth / infra setup)
    GitCommitFlowExampleModule,
    GitHubExampleModule,
    GoogleExampleModule,
    McpLinearExampleModule,
    RemoteFileExplorerExampleModule,
    SandboxExampleModule,
    SecretsExampleModule,
  ],
  controllers: [SmokeTestsController],
})
export class SmokeTestsModule {}
