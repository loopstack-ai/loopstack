import { Body, Controller, Param, Post } from '@nestjs/common';
import type { Type } from '@nestjs/common';
import {
  BaseWorkflow,
  StudioController,
  StudioEndpoint,
  UserId,
} from '@loopstack/common';
import type { WorkflowPayload, WorkflowRunResult } from '@loopstack/common';
import { WorkflowRunner } from '@loopstack/core';
import { ResolveWorkflowPipe } from '@loopstack/api';

// Basic workflows
import { WorkflowToolResultsWorkflow } from '@loopstack/accessing-tool-results-example-workflow';
import { CustomToolExampleWorkflow } from '@loopstack/custom-tool-example-module';
import { DynamicRoutingExampleWorkflow } from '@loopstack/dynamic-routing-example-workflow';
import { ErrorRetryWorkflow } from '@loopstack/error-retry-example-workflow';
import {
  RunSubWorkflowExampleParentWorkflow,
  RunSubWorkflowExampleSubWorkflow,
} from '@loopstack/run-sub-workflow-example';
import { TestUiDocumentsWorkflow } from '@loopstack/test-ui-documents-example-workflow';
import { WorkflowStateWorkflow } from '@loopstack/workflow-state-example-workflow';

// LLM workflows
import { AgentExampleWorkflow } from '@loopstack/agent-example-workflow';
import { ChatWorkflow } from '@loopstack/chat-example-workflow';
import { CodeAgentExampleWorkflow } from '@loopstack/code-agent-example-workflow';
import { DelegateErrorWorkflow } from '@loopstack/delegate-error-example-workflow';
import { MeetingNotesWorkflow } from '@loopstack/meeting-notes-example-workflow';
import { PromptWorkflow } from '@loopstack/prompt-example-workflow';
import { PromptStructuredOutputWorkflow } from '@loopstack/prompt-structured-output-example-workflow';
import { ToolCallWorkflow } from '@loopstack/tool-call-example-workflow';
import { LlmMultiProviderWorkflow } from '@loopstack/llm-multi-provider-example-workflow';

// HITL workflows
import { HitlAskUserExampleWorkflow } from '@loopstack/hitl-ask-user-example-workflow';
import { HitlConfirmExampleWorkflow } from '@loopstack/hitl-confirm-example-workflow';

// Module config workflows
import {
  DefaultGreetingWorkflow,
  GermanGreetingWorkflow,
  FrenchGreetingWorkflow,
  NestedGreetingWorkflow,
} from '@loopstack/module-config-example';

// External service workflows
import { GitCommitFlowExampleWorkflow } from '@loopstack/git-commit-flow-example-workflow';
import {
  GitHubAgentWorkflow,
  GitHubReposOverviewWorkflow,
} from '@loopstack/github-oauth-example';
import {
  CalendarSummaryWorkflow,
  GoogleWorkspaceAgentWorkflow,
} from '@loopstack/google-oauth-example';
import { McpLinearExampleWorkflow } from '@loopstack/mcp-linear-example-workflow';
import { RemoteFileExplorerExampleWorkflow } from '@loopstack/remote-file-explorer-example-workflow';
import { SandboxExampleWorkflow } from '@loopstack/sandbox-example-workflow';
import {
  SecretsExampleWorkflow,
  SecretsAgentExampleWorkflow,
} from '@loopstack/secrets-example-workflow';

const WORKFLOWS = [
  // Basic
  WorkflowToolResultsWorkflow,
  CustomToolExampleWorkflow,
  DynamicRoutingExampleWorkflow,
  ErrorRetryWorkflow,
  RunSubWorkflowExampleParentWorkflow,
  RunSubWorkflowExampleSubWorkflow,
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
  ToolCallWorkflow,
  LlmMultiProviderWorkflow,

  // HITL
  HitlAskUserExampleWorkflow,
  HitlConfirmExampleWorkflow,

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
];

@Controller('smoke-tests')
@StudioController()
export class SmokeTestsController {
  constructor(private readonly workflowRunner: WorkflowRunner) {}

  @Post('run/:workflowName')
  @StudioEndpoint({ workflows: WORKFLOWS })
  async runWorkflow(
    @UserId() userId: string,
    @Param('workflowName', new ResolveWorkflowPipe(WORKFLOWS))
    workflowClass: Type<BaseWorkflow>,
    @Body() payload: WorkflowPayload,
  ): Promise<WorkflowRunResult> {
    return this.workflowRunner.execute(workflowClass, payload, {
      userId,
      appName: 'smoke_tests',
    });
  }
}
