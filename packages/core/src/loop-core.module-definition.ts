import { ConfigurableModuleBuilder } from '@nestjs/common';

export interface LoopCoreModuleOptions {
  configs?: any[];
}

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<LoopCoreModuleOptions>().build();
