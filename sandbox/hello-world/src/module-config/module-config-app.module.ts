import { Module } from '@nestjs/common';
import { StudioApp } from '@loopstack/common';
import {
  DefaultGreetingWorkflow,
  FrenchGreetingWorkflow,
  GermanGreetingWorkflow,
  ModuleConfigExampleModule,
  NestedGreetingWorkflow,
} from '@loopstack/module-config-example';
import { ModuleConfigController } from './module-config.controller';

@StudioApp({
  title: 'Module Config Example',
  workflows: [
    DefaultGreetingWorkflow,
    GermanGreetingWorkflow,
    FrenchGreetingWorkflow,
    NestedGreetingWorkflow,
  ],
})
@Module({
  imports: [ModuleConfigExampleModule],
  controllers: [ModuleConfigController],
})
export class ModuleConfigAppModule {}
