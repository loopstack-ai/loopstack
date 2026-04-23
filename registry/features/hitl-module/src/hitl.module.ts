import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { AskClarificationTool } from './tools/ask-clarification.tool';
import { AskForApprovalTool } from './tools/ask-for-approval.tool';
import { AskUserWorkflow } from './workflows/ask-user/ask-user.workflow';
import { ConfirmUserWorkflow } from './workflows/confirm-user/confirm-user.workflow';

@Module({
  imports: [LoopCoreModule],
  providers: [AskUserWorkflow, ConfirmUserWorkflow, AskClarificationTool, AskForApprovalTool],
  exports: [AskUserWorkflow, ConfirmUserWorkflow, AskClarificationTool, AskForApprovalTool],
})
export class HitlModule {}
