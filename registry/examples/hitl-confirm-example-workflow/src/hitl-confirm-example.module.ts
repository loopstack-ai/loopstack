import { Module } from '@nestjs/common';
import { HitlModule } from '@loopstack/hitl';
import { HitlConfirmExampleWorkflow } from './hitl-confirm-example.workflow.js';

@Module({
  imports: [HitlModule],
  providers: [HitlConfirmExampleWorkflow],
  exports: [HitlConfirmExampleWorkflow],
})
export class HitlConfirmExampleModule {}
