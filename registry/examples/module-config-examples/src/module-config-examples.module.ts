import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import { GreeterModule } from './greeter/greeter.module';
import { DefaultGreetingModule } from './workflows/default-greeting/default-greeting.module';
import { DefaultGreetingWorkflow } from './workflows/default-greeting/default-greeting.workflow';
import { FrenchGreetingModule } from './workflows/french-greeting/french-greeting.module';
import { FrenchGreetingWorkflow } from './workflows/french-greeting/french-greeting.workflow';
import { GermanGreetingModule } from './workflows/german-greeting/german-greeting.module';
import { GermanGreetingWorkflow } from './workflows/german-greeting/german-greeting.workflow';
import { NestedGreetingModule } from './workflows/nested-greeting/nested-greeting.module';
import { NestedGreetingWorkflow } from './workflows/nested-greeting/nested-greeting.workflow';

const WORKFLOWS = [DefaultGreetingWorkflow, GermanGreetingWorkflow, FrenchGreetingWorkflow, NestedGreetingWorkflow];

/**
 * Hosts the four `forRoot`/`forFeature` scenarios. `GreeterModule.forRoot(...)` sets the global
 * default config once; each consumer module below either inherits it or overrides it with its own
 * `forFeature(...)`, so the same `GreeterTool` resolves to a different config per module.
 */
@StudioApp({
  title: 'Module Config Examples',
  workflows: WORKFLOWS,
})
@Module({
  imports: [
    GreeterModule.forRoot({ language: 'en', greeting: 'Hello' }),
    DefaultGreetingModule,
    GermanGreetingModule,
    FrenchGreetingModule,
    NestedGreetingModule,
  ],
  exports: [DefaultGreetingModule, GermanGreetingModule, FrenchGreetingModule, NestedGreetingModule],
})
export class ModuleConfigExamplesModule {}
