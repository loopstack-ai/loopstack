import { Module } from '@nestjs/common';
import { LoopCoreModule } from '@loopstack/core';
import { GitModule } from '@loopstack/git-module';
import { GitCommitFlowExampleWorkflow } from './git-commit-flow-example.workflow';

@Module({
  imports: [LoopCoreModule, GitModule],
  providers: [GitCommitFlowExampleWorkflow],
  exports: [GitCommitFlowExampleWorkflow],
})
export class GitCommitFlowExampleModule {}
