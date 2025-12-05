import { ModuleRef } from '@nestjs/core';
import { CapabilityFactory } from '@loopstack/common';
import { BaseCapabilityFactory } from '../../workflow-processor';

@CapabilityFactory('CoreDocumentModule')
export class CoreDocumentCapabilityFactory extends BaseCapabilityFactory {
  constructor(moduleRef: ModuleRef) {
    super(moduleRef);
  }
}
