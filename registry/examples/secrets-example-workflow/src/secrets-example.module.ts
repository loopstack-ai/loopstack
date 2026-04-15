import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { LoopCoreModule } from '@loopstack/core';
import { SecretsModule } from '@loopstack/secrets-module';
import { SecretsAgentExampleWorkflow } from './secrets-agent-example.workflow';
import { SecretsExampleWorkflow } from './secrets-example.workflow';

@Module({
  imports: [LoopCoreModule, ClaudeModule, SecretsModule],
  providers: [SecretsExampleWorkflow, SecretsAgentExampleWorkflow, SecretsAgentExampleWorkflow],
  exports: [SecretsExampleWorkflow, SecretsAgentExampleWorkflow, SecretsAgentExampleWorkflow],
})
export class SecretsExampleModule {}
