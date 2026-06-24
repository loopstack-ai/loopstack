import { Module } from '@nestjs/common';
import { GreeterModule } from '../greeter/index.js';
import { GermanGreetingWorkflow } from './german-greeting.workflow.js';

/**
 * Scenario 2: forFeature with German config.
 * The module-scoped GreeterTool overrides the global default for this module's workflows.
 */
@Module({
  imports: [GreeterModule.forFeature({ language: 'de', greeting: 'Hallo' })],
  providers: [GermanGreetingWorkflow],
  exports: [GermanGreetingWorkflow],
})
export class GermanGreetingModule {}
