import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  DocumentService,
  loadConfiguration,
  ProjectProcessorService,
  ProjectService,
  WorkspaceService,
} from '@loopstack/core';
import { TestModule } from './test.module';

export interface TestSetup {
  app: INestApplication;
  dataSource: DataSource;
  processorService: ProjectProcessorService;
  projectService: ProjectService;
  workspaceService: WorkspaceService;
  documentService: DocumentService;
  context: any;
  cleanup: () => Promise<void>;
  teardown: () => Promise<void>;
  setupWorkspaceAndProject: (workspaceType?: string, projectModel?: string) => Promise<void>;
}

export async function createPipelineTestSetup(options: {
  configPath?: string;
  mockServices?: any[];
} = {}): Promise<TestSetup> {
  const moduleRef: TestingModule = await Test.createTestingModule({
    imports: [
      TestModule.forRoot({
        configs: loadConfiguration(
          options.configPath || __dirname + '/../src/config'
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
    processorService: moduleRef.get<ProjectProcessorService>(ProjectProcessorService),
    projectService: moduleRef.get<ProjectService>(ProjectService),
    workspaceService: moduleRef.get<WorkspaceService>(WorkspaceService),
    documentService: moduleRef.get<DocumentService>(DocumentService),
  };

  let context: any = {};

  const setupWorkspaceAndProject = async (
    workspaceType: string,
    projectModel: string,
  ) => {
    if (!workspaceType) {
      throw new Error('workspaceType required.');
    }

    if (!projectModel) {
      throw new Error('projectModel required.');
    }

    // Create test workspace
    const workspace = services.workspaceService.getRepository().create({
      type: workspaceType,
      createdBy: null,
    });
    context.workspace = await services.workspaceService.getRepository().save(workspace);

    // Create test project
    const project = services.projectService.getRepository().create({
      model: projectModel,
      workspace: context.workspace,
      createdBy: null,
    });
    context.project = await services.projectService.getRepository().save(project);
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
    setupWorkspaceAndProject,
    cleanup,
    teardown,
  };
}