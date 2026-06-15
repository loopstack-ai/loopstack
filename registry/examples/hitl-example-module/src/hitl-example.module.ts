import { DynamicModule, Module } from '@nestjs/common';
import { AgentModule } from '@loopstack/agent';
import { HitlModule } from '@loopstack/hitl';
import type { LlmModuleConfig } from '@loopstack/llm-provider-module';
import { AgentAskClarificationWorkflow } from './agent-ask-clarification/agent-ask-clarification.workflow';
import { AgentAskForApprovalWorkflow } from './agent-ask-for-approval/agent-ask-for-approval.workflow';
import { AskUserConfirmWorkflow } from './ask-user-confirm/ask-user-confirm.workflow';
import { AskUserOptionsWorkflow } from './ask-user-options/ask-user-options.workflow';
import { AskUserTextWorkflow } from './ask-user-text/ask-user-text.workflow';
import { ConfirmContentWorkflow } from './confirm-content/confirm-content.workflow';
import { InlineFormWorkflow } from './inline-form/inline-form.workflow';
import { PromptInputChatWorkflow } from './prompt-input-chat/prompt-input-chat.workflow';

const PROVIDERS = [
  InlineFormWorkflow,
  PromptInputChatWorkflow,
  AskUserTextWorkflow,
  AskUserOptionsWorkflow,
  AskUserConfirmWorkflow,
  ConfirmContentWorkflow,
  AgentAskClarificationWorkflow,
  AgentAskForApprovalWorkflow,
];

@Module({})
class HitlExampleRootModule {}

@Module({
  imports: [HitlModule, AgentModule],
  providers: PROVIDERS,
  exports: PROVIDERS,
})
export class HitlExampleModule {
  static forFeature(config?: { llm?: LlmModuleConfig }): DynamicModule {
    return {
      module: HitlExampleRootModule,
      imports: [HitlModule, AgentModule.forFeature(config)],
      providers: PROVIDERS,
      exports: PROVIDERS,
    };
  }
}
