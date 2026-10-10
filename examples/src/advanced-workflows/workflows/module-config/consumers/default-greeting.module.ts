import { Module } from '@nestjs/common';
import { DefaultGreetingWorkflow } from './default-greeting.workflow.js';

/**
 * Scenario 1: No forFeature import — GreeterTool resolves from the global
 * GreeterRootModule (provided by forRoot in the app module).
 */
@Module({
  providers: [DefaultGreetingWorkflow],
  exports: [DefaultGreetingWorkflow],
})
export class DefaultGreetingModule {}
