import { Module } from '@nestjs/common';
import { GreeterAgentModule } from '../greeter/greeter-agent.module.js';
import { NestedGreetingWorkflow } from './nested-greeting.workflow.js';

/**
 * Scenario 4: Config passed through a wrapper module.
 * GreeterAgentModule.forFeature passes the config to GreeterModule.forFeature internally.
 * This is analogous to AgentModule.forFeature → LlmProviderModule.forFeature.
 */
@Module({
  imports: [GreeterAgentModule.forFeature({ greeter: { language: 'es', greeting: 'Hola' } })],
  providers: [NestedGreetingWorkflow],
  exports: [NestedGreetingWorkflow],
})
export class NestedGreetingModule {}
