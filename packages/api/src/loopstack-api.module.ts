import { INestApplication, Module } from '@nestjs/common';
import { ConfigurableModuleClass } from './loop-api.module-definition';
import { ProjectController } from './controllers/project.controller';
import { ProjectApiService } from './services/project-api.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceController } from './controllers/workspace.controller';
import { WorkspaceApiService } from './services/workspace-api.service';
import { ProcessorApiService } from './services/processor-api.service';
import {
  DocumentEntity,
  NamespaceEntity, ProjectEntity, WorkflowEntity, WorkspaceEntity,
} from '@loopstack/shared';
import { ProcessorController } from './controllers/processor.controller';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { LoopstackApiConfigPluginOptions } from './interfaces/api-config-options';
import { WorkflowController } from './controllers/workflow.controller';
import { DocumentController } from './controllers/document.controller';
import { WorkflowApiService } from './services/workflow-api.service';
import { DocumentApiService } from './services/document-api.service';
import {NamespaceController} from "./controllers/namespace.controller";
import {NamespaceApiService} from "./services/namespace-api.service";
import { LoopCoreModule } from '@loopstack/core';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forFeature([
      ProjectEntity,
      WorkspaceEntity,
      WorkflowEntity,
      DocumentEntity,
      NamespaceEntity,
    ]),
    LoopCoreModule.forRoot(),
  ],
  controllers: [
    ProjectController,
    WorkspaceController,
    ProcessorController,
    WorkflowController,
    DocumentController,
    NamespaceController,
  ],
  providers: [
    ProjectApiService,
    WorkspaceApiService,
    ProcessorApiService,
    WorkflowApiService,
    DocumentApiService,
    NamespaceApiService,
  ],
  exports: [ProjectApiService, WorkspaceApiService, ProcessorApiService],
})
export class LoopstackApiModule extends ConfigurableModuleClass {
  static setup(
    app: INestApplication,
    options: LoopstackApiConfigPluginOptions = {},
  ): void {
    const corsEnabled = options.cors?.enabled ?? true;
    if (corsEnabled) {
      app.enableCors(
        options.cors?.options ?? {
          origin: true,
          credentials: true,
        },
      );
    }

    const swaggerEnabled = options.swagger?.enabled ?? true;
    if (swaggerEnabled) {
      const config =
        options.swagger?.config ??
        new DocumentBuilder()
          .setTitle('Loopstack API Documentation')
          .setDescription('Loopstack API Documentation')
          .setVersion('1.0')
          .build();

      const documentFactory = () => SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api', app, documentFactory);
    }
  }
}
