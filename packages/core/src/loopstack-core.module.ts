import { DynamicModule, Module } from '@nestjs/common';
import { LoopstackCoreController } from './loopstack-core.controller';
import { LoopstackCoreService } from './loopstack-core.service';
import { LoopstackCoreModuleOptionsInterface } from './interfaces/loopstack-core-module-options.interface';
import { ActionCollectionService } from './services/action-collection.service';
import { CollectionService } from './services/collection.service';
import { EntityCollectionService } from './services/entity-collection.service';
import { LlmModelCollectionService } from './services/llm-model-collection.service';
import { InitService } from './services/init.service';
import { PipelineCollectionService } from './services/pipeline-collection.service';
import { ProjectCollectionService } from './services/project-collection.service';
import { PromptTemplateCollectionService } from './services/prompt-template-collection.service';
import { UtilsCollectionService } from './services/utils-collection.service';
import { WorkspaceCollectionService } from './services/workspace-collection.service';
import { WorkflowTemplateCollectionService } from './services/workflow-template-collection.service';
import { WorkflowCollectionService } from './services/workflow-collection.service';
import { ModelSchemaValidatorService } from './services/model-schema-validator.service';

@Module({
  imports: [],
  controllers: [LoopstackCoreController],
  providers: [
    LoopstackCoreService,
    ActionCollectionService,
    CollectionService,
    EntityCollectionService,
    LlmModelCollectionService,
    InitService,
    PipelineCollectionService,
    ProjectCollectionService,
    PromptTemplateCollectionService,
    UtilsCollectionService,
    WorkflowCollectionService,
    WorkflowTemplateCollectionService,
    WorkspaceCollectionService,
    ModelSchemaValidatorService,
  ],
})
export class LoopstackCoreModule {
  static forRoot(config: LoopstackCoreModuleOptionsInterface): DynamicModule {
    return {
      module: LoopstackCoreModule,
      imports: [],
    };
  }

  static forRootAsync(
    configFactory: () => Promise<LoopstackCoreModuleOptionsInterface>,
  ): DynamicModule {
    return {
      module: LoopstackCoreModule,
      imports: [
        // TypeOrmModule.forRootAsync({
        //   useFactory: dbConfigFactory,
        // }),
      ],
    };
  }
}
