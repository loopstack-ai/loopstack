import { Module } from '@nestjs/common';
import { SetContextFunction } from './functions/set-context.function';
import { FunctionsRegistry } from './registry/functions.registry';
import { DiscoveryModule } from '@nestjs/core';
import {ForwardChildContextFunction} from "./functions/forward-child-context.function";

@Module({
  imports: [DiscoveryModule],
  providers: [FunctionsRegistry, ForwardChildContextFunction, SetContextFunction],
  exports: [FunctionsRegistry],
})
export class ToolsModule {}
