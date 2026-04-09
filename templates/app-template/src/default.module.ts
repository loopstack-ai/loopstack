import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { DefaultWorkspace } from './default.workspace';

@Module({
  imports: [LoopCoreModule],
  providers: [DefaultWorkspace],
})
export class DefaultModule {}
