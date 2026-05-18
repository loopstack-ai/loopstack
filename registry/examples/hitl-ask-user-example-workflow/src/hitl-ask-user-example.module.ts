import { Module } from '@nestjs/common';
import { HitlModule } from '@loopstack/hitl';
import { HitlAskUserExampleWorkflow } from './hitl-ask-user-example.workflow';

@Module({
  imports: [HitlModule],
  providers: [HitlAskUserExampleWorkflow],
  exports: [HitlAskUserExampleWorkflow],
})
export class HitlAskUserExampleModule {}
