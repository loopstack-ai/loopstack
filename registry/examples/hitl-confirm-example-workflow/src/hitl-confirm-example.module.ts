import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { HitlModule } from '@loopstack/hitl';
import { HitlConfirmExampleWorkflow } from './hitl-confirm-example.workflow';

@Module({
  imports: [LoopCoreModule, HitlModule],
  providers: [HitlConfirmExampleWorkflow],
  exports: [HitlConfirmExampleWorkflow],
})
export class HitlConfirmExampleModule {}
