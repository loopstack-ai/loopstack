import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '../config.service';
import { WorkspaceCollectionService } from '../workspace-collection.service';
import { ProjectCollectionService } from '../project-collection.service';
import { ToolCollectionService } from '../tool-collection.service';
import { WorkflowCollectionService } from '../workflow-collection.service';
import { WorkflowTemplateCollectionService } from '../workflow-template-collection.service';
import { ActionCollectionService } from '../action-collection.service';
import { PromptTemplateCollectionService } from '../prompt-template-collection.service';
import { AdapterCollectionService } from '../adapter-collection.service';
import { DocumentCollectionService } from '../document-collection.service';
import { ConfigModule } from '@nestjs/config';
import loadSchemas from '../../configuration';
import { DynamicSchemaGeneratorService } from '../dynamic-schema-generator.service';
import { ToolRegistry } from '../tool.registry';
import { ActionRegistry } from '../action-registry.service';
import { DiscoveryModule } from '@nestjs/core';

describe('InitService', () => {
  let modelService: ConfigService;
  let workspaceCollectionService: WorkspaceCollectionService;
  let workspaceCollectionService2: WorkspaceCollectionService;
  let projectCollectionService: ProjectCollectionService;
  let utilsCollectionService: ToolCollectionService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        DiscoveryModule,
        ConfigModule.forRoot({
          load: [loadSchemas],
        }),
      ],
      providers: [
        ConfigService,
        WorkspaceCollectionService,
        ProjectCollectionService,
        ToolCollectionService,
        WorkflowCollectionService,
        WorkflowTemplateCollectionService,
        ActionCollectionService,
        PromptTemplateCollectionService,
        AdapterCollectionService,
        DocumentCollectionService,
        DynamicSchemaGeneratorService,
        ToolRegistry,
        ActionRegistry,
      ],
    }).compile();

    modelService = module.get<ConfigService>(ConfigService);
    workspaceCollectionService = module.get<WorkspaceCollectionService>(
      WorkspaceCollectionService,
    );
    workspaceCollectionService2 = module.get<WorkspaceCollectionService>(
      WorkspaceCollectionService,
    );
    projectCollectionService = module.get<ProjectCollectionService>(
      ProjectCollectionService,
    );
    utilsCollectionService = module.get<ToolCollectionService>(
      ToolCollectionService,
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
      tools: [
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
    expect(utilsCollectionService.getAll()).toEqual(mockData.tools);
  });
});
