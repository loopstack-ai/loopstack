import { Module } from '@nestjs/common';
import { ToolResultsExampleModule } from '@loopstack/accessing-tool-results-example-workflow';
import { WorkflowToolResultsWorkflow } from '@loopstack/accessing-tool-results-example-workflow';
import { AgentExampleModule } from '@loopstack/agent-example-workflow';
import { AgentExampleWorkflow } from '@loopstack/agent-example-workflow';
import { ChatExampleModule } from '@loopstack/chat-example-workflow';
import { ChatWorkflow } from '@loopstack/chat-example-workflow';
import { CodeAgentExampleModule } from '@loopstack/code-agent-example-workflow';
import { CodeAgentExampleWorkflow } from '@loopstack/code-agent-example-workflow';
import { StudioApp } from '@loopstack/common';
import { CustomToolModule } from '@loopstack/custom-tool-example-module';
import { CustomToolExampleWorkflow } from '@loopstack/custom-tool-example-module';
import { DelegateErrorExampleModule } from '@loopstack/delegate-error-example-workflow';
import { DelegateErrorWorkflow } from '@loopstack/delegate-error-example-workflow';
import { DynamicRoutingExampleModule } from '@loopstack/dynamic-routing-example-workflow';
import { DynamicRoutingExampleWorkflow } from '@loopstack/dynamic-routing-example-workflow';
import { ErrorRetryExampleModule } from '@loopstack/error-retry-example-workflow';
import { ErrorRetryWorkflow } from '@loopstack/error-retry-example-workflow';
import { GitCommitFlowExampleModule } from '@loopstack/git-commit-flow-example-workflow';
import { GitCommitFlowExampleWorkflow } from '@loopstack/git-commit-flow-example-workflow';
import { GitHubExampleModule } from '@loopstack/github-oauth-example';
import { GitHubAgentWorkflow, GitHubReposOverviewWorkflow } from '@loopstack/github-oauth-example';
import { GoogleExampleModule } from '@loopstack/google-oauth-example';
import { CalendarSummaryWorkflow, GoogleWorkspaceAgentWorkflow } from '@loopstack/google-oauth-example';
import {
  AgentAskClarificationWorkflow,
  AgentAskForApprovalWorkflow,
  AskUserConfirmWorkflow,
  AskUserOptionsWorkflow,
  AskUserTextWorkflow,
  ConfirmContentWorkflow,
  HitlExampleModule,
  InlineFormWorkflow,
  PromptInputChatWorkflow,
} from '@loopstack/hitl-example-module';
import { LlmMultiProviderExampleModule } from '@loopstack/llm-multi-provider-example-workflow';
import { LlmMultiProviderWorkflow } from '@loopstack/llm-multi-provider-example-workflow';
import { McpLinearExampleModule } from '@loopstack/mcp-linear-example-workflow';
import { McpLinearExampleWorkflow } from '@loopstack/mcp-linear-example-workflow';
import { MeetingNotesExampleModule } from '@loopstack/meeting-notes-example-workflow';
import { MeetingNotesWorkflow } from '@loopstack/meeting-notes-example-workflow';
import { ModuleConfigExampleModule } from '@loopstack/module-config-example';
import {
  DefaultGreetingWorkflow,
  FrenchGreetingWorkflow,
  GermanGreetingWorkflow,
  NestedGreetingWorkflow,
} from '@loopstack/module-config-example';
import { PromptExampleModule } from '@loopstack/prompt-example-workflow';
import { PromptWorkflow } from '@loopstack/prompt-example-workflow';
import { PromptStructuredOutputExampleModule } from '@loopstack/prompt-structured-output-example-workflow';
import { PromptStructuredOutputWorkflow } from '@loopstack/prompt-structured-output-example-workflow';
import { RemoteClientModule } from '@loopstack/remote-client';
import { RemoteFileExplorerExampleModule } from '@loopstack/remote-file-explorer-example-workflow';
import { RemoteFileExplorerExampleWorkflow } from '@loopstack/remote-file-explorer-example-workflow';
import { RunSubWorkflowExampleModule } from '@loopstack/run-sub-workflow-example';
import {
  RunSubWorkflowExampleErrorHandlingWorkflow,
  RunSubWorkflowExampleFanOutWorkflow,
  RunSubWorkflowExampleParentWorkflow,
  RunSubWorkflowExampleSequenceWorkflow,
  RunSubWorkflowExampleShowModesWorkflow,
} from '@loopstack/run-sub-workflow-example';
import { SandboxExampleModule } from '@loopstack/sandbox-example-workflow';
import { SandboxExampleWorkflow } from '@loopstack/sandbox-example-workflow';
import { SecretsExampleModule } from '@loopstack/secrets-example-workflow';
import { SecretsAgentExampleWorkflow, SecretsExampleWorkflow } from '@loopstack/secrets-example-workflow';
import { TestUiDocumentsExampleModule } from '@loopstack/test-ui-documents-example-workflow';
import { TestUiDocumentsWorkflow } from '@loopstack/test-ui-documents-example-workflow';
import { WorkflowStateExampleModule } from '@loopstack/workflow-state-example-workflow';
import { WorkflowStateWorkflow } from '@loopstack/workflow-state-example-workflow';
import { SmokeTestsController } from './smoke-tests.controller';

@StudioApp({
  title: 'Smoke Tests',
  workflows: [
    // Basic
    WorkflowToolResultsWorkflow,
    CustomToolExampleWorkflow,
    DynamicRoutingExampleWorkflow,
    ErrorRetryWorkflow,
    RunSubWorkflowExampleParentWorkflow,
    RunSubWorkflowExampleFanOutWorkflow,
    RunSubWorkflowExampleSequenceWorkflow,
    RunSubWorkflowExampleShowModesWorkflow,
    RunSubWorkflowExampleErrorHandlingWorkflow,
    TestUiDocumentsWorkflow,
    WorkflowStateWorkflow,

    // LLM
    AgentExampleWorkflow,
    ChatWorkflow,
    CodeAgentExampleWorkflow,
    DelegateErrorWorkflow,
    MeetingNotesWorkflow,
    PromptWorkflow,
    PromptStructuredOutputWorkflow,
    LlmMultiProviderWorkflow,

    // HITL
    InlineFormWorkflow,
    PromptInputChatWorkflow,
    AskUserTextWorkflow,
    AskUserOptionsWorkflow,
    AskUserConfirmWorkflow,
    ConfirmContentWorkflow,
    AgentAskClarificationWorkflow,
    AgentAskForApprovalWorkflow,

    // Module Config
    DefaultGreetingWorkflow,
    GermanGreetingWorkflow,
    FrenchGreetingWorkflow,
    NestedGreetingWorkflow,

    // External Services
    GitCommitFlowExampleWorkflow,
    GitHubAgentWorkflow,
    GitHubReposOverviewWorkflow,
    CalendarSummaryWorkflow,
    GoogleWorkspaceAgentWorkflow,
    McpLinearExampleWorkflow,
    RemoteFileExplorerExampleWorkflow,
    SandboxExampleWorkflow,
    SecretsExampleWorkflow,
    SecretsAgentExampleWorkflow,
  ],
})
@Module({
  imports: [
    // Environment slot declaration
    RemoteClientModule.forFeature({ slots: [{ id: 'sandbox', type: 'sandbox', title: 'Sandbox' }] }),

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
    LlmMultiProviderExampleModule,

    // HITL workflows
    HitlExampleModule,

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
