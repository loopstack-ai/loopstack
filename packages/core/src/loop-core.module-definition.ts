import { ConfigurableModuleBuilder } from '@nestjs/common';
import type { ConfigSourceInterface } from '@loopstack/contracts/types';

export interface LoopCoreModuleOptions {
  runStartupTasks?: boolean;
  configs?: ConfigSourceInterface[];
}

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<LoopCoreModuleOptions>().build();
