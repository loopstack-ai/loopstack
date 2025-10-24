import { ModuleRef } from '@nestjs/core';
import { Capability } from '@loopstack/shared';
import { CapabilityFactory } from '../workflow-processor';

@Capability()
export class CoreToolsFactoryService extends CapabilityFactory {
  constructor(moduleRef: ModuleRef) {
    super(moduleRef);
  }
}
