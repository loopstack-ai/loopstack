import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { loadConfiguration, ProjectProcessorService, ProjectService, WorkspaceService } from '../../src';
import { getConnectionToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TestModule } from '../test.module';
import { ProjectStatus } from '@loopstack/shared';
import { afterEach } from 'node:test';
import { Logger } from '@nestjs/common';

describe('Simple Project E2E Test', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let processorService: ProjectProcessorService;
  let projectService: ProjectService;
  let workspaceService: WorkspaceService;
  let context: any;
  let loggerSpy: jest.SpyInstance;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        TestModule.forRoot({
          configs: loadConfiguration(__dirname + '/simple-project'),
          mockServices: [],
        }),
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    dataSource = moduleRef.get(getConnectionToken());
    await app.init();

    processorService = moduleRef.get<ProjectProcessorService>(ProjectProcessorService);
    projectService = moduleRef.get<ProjectService>(ProjectService);
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

  afterEach(async  () => {
    await projectService.getRepository().clear();
    jest.clearAllMocks();
  })

  afterAll(async () => {
    await dataSource.dropDatabase();
    await app.close();
  });

  it('should throws error when project is not found', async () => {
    const userId = null;
    const projectId = '991f8235-e42b-4b4f-838c-ef1629507693';

    await expect(
      processorService.processProject({
        userId,
        projectId,
      })
    ).rejects.toThrow('project "991f8235-e42b-4b4f-838c-ef1629507693" not found.');
  });

  it('should run the project if found', async () => {
    const userId = null;

    const project = projectService.getRepository().create({
      id: '991f8235-e42b-4b4f-838c-ef1629507693',
      model: 'test',
      title: '',
      status: ProjectStatus.New,
      workspace: context.workspace,
      createdBy: null,
    });
    await projectService.getRepository().save(project);

    const res = await processorService.processProject({
      userId,
      projectId: project.id,
    });

    expect(res).toBeDefined();
    expect(loggerSpy).toHaveBeenCalledWith(
      expect.stringContaining('test message')
    );
  });

});