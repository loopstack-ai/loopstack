import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  DocumentService,
  loadConfiguration,
  PipelineProcessorService,
  PipelineService, WorkflowService,
  WorkspaceService,
} from '@loopstack/core';
import { TestModule } from './test.module';

export interface TestSetup {
  app: INestApplication;
  dataSource: DataSource;
  processorService: PipelineProcessorService;
  pipelineService: PipelineService;
  workflowService: WorkflowService;
  workspaceService: WorkspaceService;
  documentService: DocumentService;
  context: any;
  cleanup: () => Promise<void>;
  teardown: () => Promise<void>;
  setupWorkspaceAndPipeline: (workspaceType?: string, projectModel?: string) => Promise<void>;
}

export async function createPipelineTestSetup(options: {
  configPath?: string;
  mockServices?: any[];
} = {}): Promise<TestSetup> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [
      TestModule.forRoot({
        configs: loadConfiguration(
          options.configPath || __dirname + '/../../src/config'
        ),
        mockServices: options.mockServices || [],
      }),
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  const dataSource = moduleRef.get(getConnectionToken());

  await app.init();

  const services = {
    app,
    dataSource,
    processorService: moduleRef.get<PipelineProcessorService>(PipelineProcessorService),
    pipelineService: moduleRef.get<PipelineService>(PipelineService),
    workspaceService: moduleRef.get<WorkspaceService>(WorkspaceService),
    documentService: moduleRef.get<DocumentService>(DocumentService),
    workflowService: moduleRef.get<WorkflowService>(WorkflowService),
  };

  let context: any = {};

  const setupWorkspaceAndPipeline = async (
    workspaceType: string,
    pipelineModel: string,
  ) => {
    if (!workspaceType) {
      throw new Error('workspaceType required.');
    }

    if (!pipelineModel) {
      throw new Error('pipelineModel required.');
    }

    // Create test workspace
    const workspace = services.workspaceService.getRepository().create({
      type: workspaceType,
      createdBy: null,
    });
    context.workspace = await services.workspaceService.getRepository().save(workspace);

    // Create test pipeline
    const pipeline = services.pipelineService.getRepository().create({
      model: pipelineModel,
      workspace: context.workspace,
      createdBy: null,
    });
    context.pipeline = await services.pipelineService.getRepository().save(pipeline);
  };

  const cleanup = async () => {
    await dataSource.synchronize(true);
    jest.clearAllMocks();
    context = {};
  };

  const teardown = async () => {
    await dataSource.destroy();
    await app.close();
  };

  return {
    ...services,
    context,
    setupWorkspaceAndPipeline,
    cleanup,
    teardown,
  };
}