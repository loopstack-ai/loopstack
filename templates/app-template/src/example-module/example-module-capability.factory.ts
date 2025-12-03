import { ModuleRef } from '@nestjs/core';
import { CapabilityFactory } from '@loopstack/common';
import { BaseCapabilityFactory } from '@loopstack/core';

@CapabilityFactory('ExampleModule')
export class ExampleModuleCapabilityFactory extends BaseCapabilityFactory {
  constructor(moduleRef: ModuleRef) {
    super(moduleRef);
  }
}