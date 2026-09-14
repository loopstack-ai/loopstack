import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { StarterWorkflow } from './workflows/starter/starter.workflow';

/**
 * Scaffold `@StudioApp` module. After copying to `registry/examples/<name>`, rename this class/file/title
 * and register your example's workflows here (and import any provider modules they need, e.g. ClaudeModule).
 */
@StudioApp({
  title: 'Example Scaffold',
  workflows: [StarterWorkflow],
})
@Module({
  providers: [StarterWorkflow],
  exports: [StarterWorkflow],
})
export class ExampleScaffoldModule {}
