import { Module } from '@nestjs/common';
import { ClaudeModule } from '@loopstack/claude-module';
import { SecretsModule } from '@loopstack/secrets-module';
import { SecretsAgentExampleWorkflow } from './secrets-agent-example.workflow.js';
import { SecretsExampleWorkflow } from './secrets-example.workflow.js';

@Module({
  imports: [ClaudeModule, SecretsModule],
  providers: [SecretsExampleWorkflow, SecretsAgentExampleWorkflow, SecretsAgentExampleWorkflow],
  exports: [SecretsExampleWorkflow, SecretsAgentExampleWorkflow, SecretsAgentExampleWorkflow],
})
export class SecretsExampleModule {}
