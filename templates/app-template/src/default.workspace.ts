import { Injectable } from '@nestjs/common';
import { WorkflowToolResultsWorkflow } from '@loopstack/accessing-tool-results-example-workflow';
import { ChatWorkflow } from '@loopstack/chat-example-workflow';
import { InjectWorkflow, Workspace } from '@loopstack/common';
import { CustomToolExampleWorkflow } from '@loopstack/custom-tool-example-module';
import { DynamicRoutingExampleWorkflow } from '@loopstack/dynamic-routing-example-workflow';
import { GitHubAgentWorkflow, GitHubReposOverviewWorkflow } from '@loopstack/github-oauth-example';
import { CalendarSummaryWorkflow, GoogleWorkspaceAgentWorkflow } from '@loopstack/google-oauth-example';
import { MeetingNotesWorkflow } from '@loopstack/meeting-notes-example-workflow';
import { PromptWorkflow } from '@loopstack/prompt-example-workflow';
import { PromptStructuredOutputWorkflow } from '@loopstack/prompt-structured-output-example-workflow';
import { RunSubWorkflowExampleParentWorkflow } from '@loopstack/run-sub-workflow-example';
import { SandboxExampleWorkflow } from '@loopstack/sandbox-example-workflow';
import { SecretsAgentExampleWorkflow, SecretsExampleWorkflow } from '@loopstack/secrets-example-workflow';
import { TestUiDocumentsWorkflow } from '@loopstack/test-ui-documents-example-workflow';
import { ToolCallWorkflow } from '@loopstack/tool-call-example-workflow';
import { WorkflowStateWorkflow } from '@loopstack/workflow-state-example-workflow';

@Injectable()
@Workspace({
  uiConfig: {
    title: 'Default Workspace',
  },
})
export class DefaultWorkspace {
  @InjectWorkflow() meetingNotesWorkflow: MeetingNotesWorkflow;
  @InjectWorkflow() chatWorkflow: ChatWorkflow;
  @InjectWorkflow() promptWorkflow: PromptWorkflow;
  @InjectWorkflow() promptStructuredOutputWorkflow: PromptStructuredOutputWorkflow;
  @InjectWorkflow() toolCallWorkflow: ToolCallWorkflow;
  @InjectWorkflow() workflowStateWorkflow: WorkflowStateWorkflow;
  @InjectWorkflow() dynamicRoutingExampleWorkflow: DynamicRoutingExampleWorkflow;
  @InjectWorkflow() customToolExampleWorkflow: CustomToolExampleWorkflow;
  @InjectWorkflow() workflowToolResultsWorkflow: WorkflowToolResultsWorkflow;
  @InjectWorkflow() runSubWorkflowExampleParent: RunSubWorkflowExampleParentWorkflow;
  @InjectWorkflow() testUiDocumentsWorkflow: TestUiDocumentsWorkflow;
  @InjectWorkflow() secretsExampleWorkflow: SecretsExampleWorkflow;
  @InjectWorkflow() secretsAgentExampleWorkflow: SecretsAgentExampleWorkflow;
  @InjectWorkflow() sandboxExampleWorkflow: SandboxExampleWorkflow;
  @InjectWorkflow() googleWorkspaceAgentWorkflow: GoogleWorkspaceAgentWorkflow;
  @InjectWorkflow() calendarSummaryWorkflow: CalendarSummaryWorkflow;
  @InjectWorkflow() gitHubAgentWorkflow: GitHubAgentWorkflow;
  @InjectWorkflow() gitHubReposOverviewWorkflow: GitHubReposOverviewWorkflow;
}
