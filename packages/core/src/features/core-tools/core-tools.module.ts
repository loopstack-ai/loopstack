import { Module } from '@nestjs/common';
import { CoreToolsModuleCapabilityFactory } from './core-tools-module-capability.factory';
import { CreateValue, DelegateService, SwitchTarget } from './index';
import { CommonModule } from '../../common';
import { WorkflowProcessorModule } from '../../workflow-processor';
import { DelegateTool } from './tools/delegate.tool';

@Module({
  imports: [CommonModule, WorkflowProcessorModule],
  providers: [
    CoreToolsModuleCapabilityFactory,

    DelegateTool,
    DelegateService,

    SwitchTarget,
    CreateValue,
  ],
  exports: [CoreToolsModuleCapabilityFactory, DelegateService],
})
export class CoreToolsModule {}
