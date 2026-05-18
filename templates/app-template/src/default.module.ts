import { Module } from '@nestjs/common';
import { DefaultWorkspace } from './default.workspace';

@Module({
  imports: [],
  providers: [DefaultWorkspace],
})
export class DefaultModule {}
