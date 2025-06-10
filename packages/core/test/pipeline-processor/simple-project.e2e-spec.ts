import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import {
  loadConfiguration,
  PipelineProcessorService,
  PipelineService,
  WorkspaceService,
} from '../../src';
import { getConnectionToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TestModule } from '../test.module';
import { PipelineStatus } from '@loopstack/shared';
import { afterEach } from 'node:test';
import { Logger } from '@nestjs/common';

describe('Simple Pipeline E2E Test', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let processorService: PipelineProcessorService;
  let pipelineService: PipelineService;
  let workspaceService: WorkspaceService;
  let context: any;
  let loggerSpy: jest.SpyInstance;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TestModule.forRoot({
          configs: loadConfiguration(__dirname + '/simple-pipeline'),
          mockServices: [],
        }),
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    dataSource = moduleRef.get(getConnectionToken());
    await app.init();

    processorService = moduleRef.get<PipelineProcessorService>(
      PipelineProcessorService,
    );
    pipelineService = moduleRef.get<PipelineService>(PipelineService);
    workspaceService = moduleRef.get<WorkspaceService>(WorkspaceService);
    context = {};
  });

  beforeEach(async () => {
    loggerSpy = jest.spyOn(Logger.prototype, 'log').mockImplementation();

    // workspace
    const workspace = workspaceService.getRepository().create({
      title: 'Test Workspace',
      createdBy: null,
    });
    await workspaceService.getRepository().save(workspace);
    context.workspace = workspace;
  });

  afterEach(async () => {
    await pipelineService.getRepository().clear();
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await dataSource.dropDatabase();
    await app.close();
  });

  it('should throws error when project is not found', async () => {
    const userId = null;
    const projectId = '991f8235-e42b-4b4f-838c-ef1629507693';

    await expect(
      processorService.processPipeline({
        userId,
        pipelineId: projectId,
      }),
    ).rejects.toThrow(
      'project "991f8235-e42b-4b4f-838c-ef1629507693" not found.',
    );
  });

  it('should run the project if found', async () => {
    const userId = null;

    const project = pipelineService.getRepository().create({
      id: '991f8235-e42b-4b4f-838c-ef1629507693',
      model: 'test',
      title: '',
      status: PipelineStatus.New,
      workspace: context.workspace,
      createdBy: null,
    });
    await pipelineService.getRepository().save(project);

    const res = await processorService.processPipeline({
      userId,
      pipelineId: project.id,
    });

    expect(res).toBeDefined();
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('test message'),
    );
  });
});
