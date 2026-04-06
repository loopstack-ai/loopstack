import { Module } from '@nestjs/common';
import { ToolResultsExampleModule } from '@loopstack/accessing-tool-results-example-workflow';
import { ChatExampleModule } from '@loopstack/chat-example-workflow';
import { LoopCoreModule } from '@loopstack/core';
import { CreateChatMessageToolModule } from '@loopstack/create-chat-message-tool';
import { CustomToolModule } from '@loopstack/custom-tool-example-module';
import { DynamicRoutingExampleModule } from '@loopstack/dynamic-routing-example-workflow';
import { GitHubExampleModule } from '@loopstack/github-oauth-example';
import { GoogleExampleModule } from '@loopstack/google-oauth-example';
import { MeetingNotesExampleModule } from '@loopstack/meeting-notes-example-workflow';
import { PromptExampleModule } from '@loopstack/prompt-example-workflow';
import { PromptStructuredOutputExampleModule } from '@loopstack/prompt-structured-output-example-workflow';
import { RunSubWorkflowExampleModule } from '@loopstack/run-sub-workflow-example';
import { SandboxExampleModule } from '@loopstack/sandbox-example-workflow';
import { SecretsExampleModule } from '@loopstack/secrets-example-workflow';
import { TestUiDocumentsExampleModule } from '@loopstack/test-ui-documents-example-workflow';
import { ToolCallingExampleModule } from '@loopstack/tool-call-example-workflow';
import { WorkflowStateExampleModule } from '@loopstack/workflow-state-example-workflow';
import { DefaultWorkspace } from './default.workspace';

@Module({
  imports: [
    LoopCoreModule,
    CreateChatMessageToolModule,
    MeetingNotesExampleModule,
    ChatExampleModule,
    PromptExampleModule,
    PromptStructuredOutputExampleModule,
    ToolCallingExampleModule,
    WorkflowStateExampleModule,
    DynamicRoutingExampleModule,
    CustomToolModule,
    ToolResultsExampleModule,
    RunSubWorkflowExampleModule,
    TestUiDocumentsExampleModule,
    SecretsExampleModule,
    SandboxExampleModule,
    GoogleExampleModule,
    GitHubExampleModule,
  ],
  providers: [DefaultWorkspace],
})
export class DefaultModule {}
