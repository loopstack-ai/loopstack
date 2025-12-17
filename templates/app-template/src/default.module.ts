import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { CoreUiModule } from '@loopstack/core-ui-module';
import { DefaultWorkspace } from './default.workspace';
import { HelloWorldWorkflow } from './hello-world/hello-world.workflow';

@Module({
  imports: [LoopCoreModule, CoreUiModule],
  providers: [
    DefaultWorkspace,
    HelloWorldWorkflow,
  ],
})
export class DefaultModule {}