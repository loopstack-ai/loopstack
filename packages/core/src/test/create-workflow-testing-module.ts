import { Test, TestingModule } from '@nestjs/testing';
import { Module, Type, ConsoleLogger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import {
  BaseCapabilityFactory,
  BlockFactory,
  BlockHelperService,
  BlockProcessor,
  BlockRegistryService,
  CapabilityBuilder,
  ConfigLoaderService,
  NamespaceProcessorService,
  StateMachineProcessorService,
  StateMachineToolCallProcessorService,
  Workflow,
} from '../workflow-processor';
import { DiscoveryService, Reflector } from '@nestjs/core';
import { CapabilityFactory } from '@loopstack/common';
import { CommonModule, ObjectExpressionHandler } from '../common';
import { NamespacesService, WorkflowService } from '../persistence';

export interface MockProvider<T = any> {
  provide: Type<T>;
  useValue: Partial<T>;
}

export interface WorkflowTestContext<TWorkflow extends Workflow = Workflow> {
  module: TestingModule;
  blockFactory: BlockFactory;
  createWorkflow: <TArgs = any>(args: TArgs, ctx?: any) => Promise<TWorkflow>;
  getMock: <T>(token: Type) => T;
}

export async function createWorkflowTestingModule(
  workflowModule: any,
): Promise<TestingModule> {
  const mockWorkflowService = { save: jest.fn() };
  const mockNamespacesService = {
    create: jest.fn(),
    delete: jest.fn(),
    getChildNamespaces: jest.fn(),
  };

  return await Test.createTestingModule({
    imports: [workflowModule, CommonModule],
    providers: [
      StateMachineProcessorService,
      BlockHelperService,
      StateMachineToolCallProcessorService,
      NamespaceProcessorService,
      ObjectExpressionHandler,

      ConfigLoaderService,
      DiscoveryService,
      Reflector,
      BlockRegistryService,
      CapabilityBuilder,
      BlockFactory,
      BlockProcessor,
      {
        provide: WorkflowService,
        useValue: mockWorkflowService,
      },
      {
        provide: NamespacesService,
        useValue: mockNamespacesService,
      },
    ],
  })
    .setLogger(new ConsoleLogger())
    .compile();
}

export async function createWorkflowTestingContext<TWorkflow extends Workflow>(
  toolClass: Type<TWorkflow>,
  providers: any[] = [],
): Promise<WorkflowTestContext<TWorkflow>> {
  @CapabilityFactory('DynamicToolTestingModule')
  class DynamicCapabilityFactory extends BaseCapabilityFactory {
    constructor(moduleRef: ModuleRef) {
      super(moduleRef);
    }
  }

  @Module({
    providers: [DynamicCapabilityFactory, toolClass, ...providers],
    exports: [DynamicCapabilityFactory],
  })
  class DynamicToolTestingModule {}

  const module = await createWorkflowTestingModule(DynamicToolTestingModule);
  await module.init();

  const blockFactory = module.get(BlockFactory);

  return {
    module,
    blockFactory,
    createWorkflow: async <TArgs = any>(args: TArgs, ctx: any = {}) => {
      return blockFactory.createBlock<TWorkflow, TArgs>(
        toolClass.name,
        args,
        ctx,
      );
    },
    getMock: <T>(token: Type<T>) => module.get<T>(token),
  };
}
