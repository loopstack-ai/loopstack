import { Module } from '@nestjs/common';
import { GitModule } from '@loopstack/git-module';
import { GitCommitFlowExampleWorkflow } from './git-commit-flow-example.workflow.js';

@Module({
  imports: [GitModule],
  providers: [GitCommitFlowExampleWorkflow],
  exports: [GitCommitFlowExampleWorkflow],
})
export class GitCommitFlowExampleModule {}
