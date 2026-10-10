import { Module } from '@nestjs/common';
import { AskClarificationTool } from './tools/ask-clarification.tool.js';
import { AskForApprovalTool } from './tools/ask-for-approval.tool.js';
import { AskUserWorkflow } from './workflows/ask-user/ask-user.workflow.js';
import { ConfirmUserWorkflow } from './workflows/confirm-user/confirm-user.workflow.js';

/**
 * NestJS module that provides human-in-the-loop workflows and tools — the
 * `AskUserWorkflow` and `ConfirmUserWorkflow` sub-workflows plus the
 * `AskClarificationTool` and `AskForApprovalTool` — letting agents pause to
 * gather user input or approval.
 *
 * Registration:
 * - `HitlModule` (bare import) — registers and exports the workflows and tools.
 *   There is no `forRoot` / `forFeature`; a plain import is all that is needed.
 *
 * Requires: nothing beyond importing the module.
 *
 * @public
 */
@Module({
  providers: [AskUserWorkflow, ConfirmUserWorkflow, AskClarificationTool, AskForApprovalTool],
  exports: [AskUserWorkflow, ConfirmUserWorkflow, AskClarificationTool, AskForApprovalTool],
})
export class HitlModule {}
