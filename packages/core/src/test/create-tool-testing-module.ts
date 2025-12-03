import { Test, TestingModule } from '@nestjs/testing';
import { BlockFactory, BlockRegistryService, CapabilityBuilder, ConfigLoaderService } from '../workflow-processor';
import { DiscoveryService, Reflector } from '@nestjs/core';

export async function createToolTestingModule(toolModule: any): Promise<TestingModule> {
  return await Test.createTestingModule({
    imports: [
      toolModule
    ],
    providers: [
      ConfigLoaderService,
      DiscoveryService,
      Reflector,
      BlockRegistryService,
      CapabilityBuilder,
      BlockFactory,
    ],
  }).compile();
}
