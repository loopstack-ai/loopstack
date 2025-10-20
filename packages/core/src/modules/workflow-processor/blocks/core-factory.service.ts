import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Capability } from '@loopstack/shared';
import { CapabilityFactory } from '../../../factories';

@Injectable()
@Capability()
export class CoreFactoryService extends CapabilityFactory {
  constructor(moduleRef: ModuleRef) {
    super(moduleRef);
  }
}