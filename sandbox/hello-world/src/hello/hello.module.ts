import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { AgentModule } from '@loopstack/agent';
import { ClaudeModule } from '@loopstack/claude-module';
import { LlmProviderModule } from '@loopstack/llm-provider-module';
import { AgentExampleWorkflow } from '@loopstack/agent-example-workflow';
import { CustomToolExampleWorkflow } from '@loopstack/custom-tool-example-module';
import {
  RunSubWorkflowExampleParentWorkflow,
  RunSubWorkflowExampleSubWorkflow,
} from '@loopstack/run-sub-workflow-example';
import {
  SecretsExampleWorkflow,
  SecretsAgentExampleWorkflow,
} from '@loopstack/secrets-example-workflow';
import { AgentTestWorkflow } from './agent-test.workflow';
import { HelloController } from './hello.controller';
import { HelloWorkflow } from './hello.workflow';
import { PromptWorkflow } from './prompt.workflow';

@StudioApp({
  title: 'Hello World',
  workflows: [
    HelloWorkflow,
    PromptWorkflow,
    AgentTestWorkflow,
    AgentExampleWorkflow,
    CustomToolExampleWorkflow,
    RunSubWorkflowExampleParentWorkflow,
    RunSubWorkflowExampleSubWorkflow,
    SecretsExampleWorkflow,
    SecretsAgentExampleWorkflow,
  ],
})
@Module({
  imports: [
    ClaudeModule,
    AgentModule,
    LlmProviderModule.forFeature({ model: 'claude-sonnet-4-5' }),
  ],
  controllers: [HelloController],
  providers: [HelloWorkflow, PromptWorkflow, AgentTestWorkflow],
})
export class HelloModule {}
