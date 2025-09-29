import { Module } from '@nestjs/common';
import { BlockWorkspace } from './workspaces/block-workspace';
import { BlockPipeline } from './pipelines/block-pipeline';
import { BlockWorkflow } from './workflows/block-workflow';
import { CreateMock } from './tools/create-mock-tool';
import { LoopCoreModule } from '@loopstack/core';

@Module({
  imports: [
    LoopCoreModule
  ],
  providers: [
    BlockWorkspace,
    BlockPipeline,
    BlockWorkflow,
    CreateMock,
  ],
})
export class MyModuleModule {}
