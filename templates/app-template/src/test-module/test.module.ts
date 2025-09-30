import { Module } from '@nestjs/common';
import { BlockWorkspace } from './workspaces/block-workspace';
import { BlockPipeline } from './pipelines/block-pipeline';
import { BlockWorkflow } from './workflows/block-workflow';
import { LoopCoreModule } from '@loopstack/core';

@Module({
  imports: [
    LoopCoreModule,
  ],
  providers: [
    BlockWorkspace,
    BlockPipeline,
    BlockWorkflow,
  ],
})
export class TestModule {}
