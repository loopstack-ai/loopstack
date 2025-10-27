import { ModuleRef } from '@nestjs/core';
import { Capability } from '@loopstack/shared';
import { CapabilityFactory } from '@loopstack/core';

@Capability()
export class ExampleModuleFactoryService extends CapabilityFactory {
  constructor(moduleRef: ModuleRef) {
    super(moduleRef);
  }
}