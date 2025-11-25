import { ModuleRef } from '@nestjs/core';
import { Capability } from '@loopstack/common';
import { CapabilityFactory } from '@loopstack/core';

@Capability()
export class ExampleModuleFactoryService extends CapabilityFactory {
  constructor(moduleRef: ModuleRef) {
    super(moduleRef);
  }
}