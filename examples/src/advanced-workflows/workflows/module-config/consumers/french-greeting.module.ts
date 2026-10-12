import { Module } from '@nestjs/common';
import { GreeterModule } from '../greeter/index.js';
import { FrenchGreetingWorkflow } from './french-greeting.workflow.js';

/**
 * Scenario 2: forFeature with French config.
 * The module-scoped GreeterTool overrides the global default for this module's workflows.
 */
@Module({
  imports: [GreeterModule.forFeature({ language: 'fr', greeting: 'Bonjour' })],
  providers: [FrenchGreetingWorkflow],
  exports: [FrenchGreetingWorkflow],
})
export class FrenchGreetingModule {}
