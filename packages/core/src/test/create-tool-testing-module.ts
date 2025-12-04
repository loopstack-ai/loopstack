import { Test, TestingModule } from '@nestjs/testing';
import { Module, Type, Provider } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  BaseCapabilityFactory,
  BlockFactory,
  BlockRegistryService,
  CapabilityBuilder,
  ConfigLoaderService,
  Tool,
} from '../workflow-processor';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { CapabilityFactory } from '@loopstack/common';

export interface MockProvider<T = any> {
  provide: Type<T>;
  mock: Partial<T>;
}

export interface ToolTestContext<TTool extends Tool = Tool> {
  module: TestingModule;
  blockFactory: BlockFactory;
  createTool: <TArgs = any>(args: TArgs, ctx?: any) => Promise<TTool>;
  getMock: <T>(token: Type<T>) => T;
}

export async function createToolTestingModule(toolModule: any): Promise<TestingModule> {
  return await Test.createTestingModule({
    imports: [toolModule],
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

export async function createToolTestingContext<TTool extends Tool>(
  toolClass: Type<TTool>,
  mockProviders: MockProvider[] = [],
): Promise<ToolTestContext<TTool>> {
  @CapabilityFactory('DynamicToolTestingModule')
  class DynamicCapabilityFactory extends BaseCapabilityFactory {
    constructor(moduleRef: ModuleRef) {
      super(moduleRef);
    }
  }

  const providers: Provider[] = [
    DynamicCapabilityFactory,
    toolClass,
    ...mockProviders.map(({ provide, mock }) => ({
      provide,
      useValue: mock,
    })),
  ];

  @Module({
    providers,
    exports: [DynamicCapabilityFactory],
  })
  class DynamicToolTestingModule {}

  const module = await createToolTestingModule(DynamicToolTestingModule);
  await module.init();

  const blockFactory = module.get(BlockFactory);

  return {
    module,
    blockFactory,
    createTool: async <TArgs = any>(args: TArgs, ctx: any = {}) => {
      return blockFactory.createBlock<TTool, TArgs>(toolClass.name, args, ctx);
    },
    getMock: <T>(token: Type<T>) => module.get<T>(token),
  };
}