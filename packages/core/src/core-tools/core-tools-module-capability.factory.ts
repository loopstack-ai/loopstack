import { ModuleRef } from '@nestjs/core';
import { CapabilityFactory } from '@loopstack/common';
import { BaseCapabilityFactory } from '../workflow-processor';

@CapabilityFactory('CoreToolsModule')
export class CoreToolsModuleCapabilityFactory extends BaseCapabilityFactory {
  constructor(moduleRef: ModuleRef) {
    super(moduleRef);
  }
}
