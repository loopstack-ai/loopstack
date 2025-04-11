import { ConfigurableModuleBuilder } from '@nestjs/common';
import { MainConfigType } from '@loopstack/shared';

export interface LoopCoreModuleOptions {
  configs?: MainConfigType[];
}

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<LoopCoreModuleOptions>().build();
