import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { AskUserWorkflow } from './workflows/ask-user/ask-user.workflow';
import { ConfirmUserWorkflow } from './workflows/confirm-user/confirm-user.workflow';

@Module({
  imports: [LoopCoreModule],
  providers: [AskUserWorkflow, ConfirmUserWorkflow],
  exports: [AskUserWorkflow, ConfirmUserWorkflow],
})
export class HitlModule {}
