import { Module } from '@nestjs/common';
import { AskClarificationTool } from './tools/ask-clarification.tool.js';
import { AskForApprovalTool } from './tools/ask-for-approval.tool.js';
import { AskUserWorkflow } from './workflows/ask-user/ask-user.workflow.js';
import { ConfirmUserWorkflow } from './workflows/confirm-user/confirm-user.workflow.js';

@Module({
  providers: [AskUserWorkflow, ConfirmUserWorkflow, AskClarificationTool, AskForApprovalTool],
  exports: [AskUserWorkflow, ConfirmUserWorkflow, AskClarificationTool, AskForApprovalTool],
})
export class HitlModule {}
