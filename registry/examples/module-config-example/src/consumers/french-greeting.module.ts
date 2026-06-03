import { Module } from '@nestjs/common';
import { GreeterModule } from '../greeter/index.js';
import { FrenchGreetingWorkflow } from './french-greeting.workflow.js';

/**
 * Scenario 3: forFeature with French config.
 * Runs alongside GermanGreetingModule — proves each module gets its own config.
 */
@Module({
  imports: [GreeterModule.forFeature({ language: 'fr', greeting: 'Bonjour' })],
  providers: [FrenchGreetingWorkflow],
  exports: [FrenchGreetingWorkflow],
})
export class FrenchGreetingModule {}
