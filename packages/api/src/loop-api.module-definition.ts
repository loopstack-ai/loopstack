import { ConfigurableModuleBuilder } from '@nestjs/common';
import { ModuleOptionsInterface } from './interfaces/module-options.interface';

export const { ConfigurableModuleClass, MODULE_OPTIONS_TOKEN } =
  new ConfigurableModuleBuilder<ModuleOptionsInterface>().build();
