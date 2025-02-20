import { Test, TestingModule } from '@nestjs/testing';
import { InitService } from './init.service';
import { WorkspaceCollectionService } from './workspace-collection.service';
import { ProjectCollectionService } from './project-collection.service';
import { UtilsCollectionService } from './utils-collection.service';
import { PipelineCollectionService } from './pipeline-collection.service';
import { WorkflowCollectionService } from './workflow-collection.service';
import { WorkflowTemplateCollectionService } from './workflow-template-collection.service';
import { ActionCollectionService } from './action-collection.service';
import { PromptTemplateCollectionService } from './prompt-template-collection.service';
import { AdapterCollectionService } from './adapter-collection.service';
import { EntityCollectionService } from './entity-collection.service';
import {ConfigModule, ConfigService} from "@nestjs/config";
import loadSchemas from "../configuration";

describe('InitService', () => {
  let modelService: InitService;
  let workspaceCollectionService: WorkspaceCollectionService;
  let workspaceCollectionService2: WorkspaceCollectionService;
  let projectCollectionService: ProjectCollectionService;
  let utilsCollectionService: UtilsCollectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          load: [loadSchemas],
        }),
      ],
      providers: [
        ConfigService,
        InitService,
        WorkspaceCollectionService,
        ProjectCollectionService,
        UtilsCollectionService,
        PipelineCollectionService,
        WorkflowCollectionService,
        WorkflowTemplateCollectionService,
        ActionCollectionService,
        PromptTemplateCollectionService,
        AdapterCollectionService,
        EntityCollectionService,
      ],
    }).compile();

    modelService = module.get<InitService>(InitService);
    workspaceCollectionService = module.get<WorkspaceCollectionService>(
      WorkspaceCollectionService,
    );
    workspaceCollectionService2 = module.get<WorkspaceCollectionService>(
      WorkspaceCollectionService,
    );
    projectCollectionService = module.get<ProjectCollectionService>(
      ProjectCollectionService,
    );
    utilsCollectionService = module.get<UtilsCollectionService>(
      UtilsCollectionService,
    );
  });

  it('should create collections and get the correct items', () => {
    const mockData = {
      workspaces: [
        {
          name: 'Workspace 1',
        },
      ],
      projects: [
        {
          name: 'Project 1',
          workspace: 'Workspace 1',
          entrypoint: 'MainPipeline',
        },
      ],
      utils: [
        {
          name: 'Util 1',
          execute: [],
        },
      ],
    };

    modelService.createFromConfig(mockData);

    // assure singleton
    expect(workspaceCollectionService.getAll()).toEqual(mockData.workspaces);
    expect(workspaceCollectionService2.getAll()).toEqual(mockData.workspaces);

    // assure transient for other collections
    expect(projectCollectionService.getAll()).toEqual(mockData.projects);
    expect(utilsCollectionService.getAll()).toEqual(mockData.utils);
  });
});
