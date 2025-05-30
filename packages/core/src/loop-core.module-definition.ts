import { ConfigurableModuleBuilder } from '@nestjs/common';
import { ConfigSourceInterface } from './modules';

export interface LoopCoreModuleOptions {
  installTemplates?: boolean;
  configs?: ConfigSourceInterface[];
}

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<LoopCoreModuleOptions>().build();
