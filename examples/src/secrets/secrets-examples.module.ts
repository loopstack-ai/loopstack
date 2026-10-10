import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude';
import { StudioApp } from '@loopstack/common';
import { SecretsModule } from '@loopstack/secrets';
import { AgenticExampleWorkflow } from './workflows/agentic/agentic-example.workflow';
import { DeterministicExampleWorkflow } from './workflows/deterministic/deterministic-example.workflow';

@StudioApp({
  title: 'Secrets Examples',
  workflows: [DeterministicExampleWorkflow, AgenticExampleWorkflow],
})
@Module({
  imports: [ClaudeModule, SecretsModule.forFeature()],
  providers: [DeterministicExampleWorkflow, AgenticExampleWorkflow],
  exports: [DeterministicExampleWorkflow, AgenticExampleWorkflow],
})
export class SecretsExamplesModule {}
