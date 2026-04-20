import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { HitlModule } from '@loopstack/hitl';
import { HitlAskUserExampleWorkflow } from './hitl-ask-user-example.workflow';

@Module({
  imports: [LoopCoreModule, HitlModule],
  providers: [HitlAskUserExampleWorkflow],
  exports: [HitlAskUserExampleWorkflow],
})
export class HitlAskUserExampleModule {}
