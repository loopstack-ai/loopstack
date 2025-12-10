import { Module } from '@nestjs/common';
import { CreateValue, DelegateService, SwitchTarget } from './index';
import { CommonModule } from '../../common';
import { WorkflowProcessorModule } from '../../workflow-processor';
import { DelegateTool } from './tools/delegate.tool';

@Module({
  imports: [CommonModule, WorkflowProcessorModule],
  providers: [
    DelegateTool,
    DelegateService,
    SwitchTarget,
    CreateValue,
  ],
  exports: [
    DelegateTool,
    DelegateService,
    SwitchTarget,
    CreateValue,
  ],
})
export class CoreToolsModule {}
