import { Module } from '@nestjs/common';
import { SetContextFunction } from './functions/set-context.function';
import { FunctionsRegistry } from './registry/functions.registry';
import { DiscoveryModule } from '@nestjs/core';

@Module({
  imports: [DiscoveryModule],
  providers: [SetContextFunction, FunctionsRegistry],
  exports: [FunctionsRegistry, SetContextFunction],
})
export class ToolsModule {}
