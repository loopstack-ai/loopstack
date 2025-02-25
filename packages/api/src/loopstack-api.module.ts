import { Module } from '@nestjs/common';
import { ConfigurableModuleClass } from './loop-api.module-definition';
import { ProjectController } from './controllers/project.controller';
import { ProjectApiService } from './services/project-api.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectEntity } from '@loopstack/core/dist/persistence/entities/project.entity';
import { WorkspaceEntity } from '@loopstack/core/dist/persistence/entities/workspace.entity';
import { WorkspaceController } from './controllers/workspace.controller';
import { WorkspaceApiService } from './services/workspace-api.service';
import {ProcessorApiService} from "./services/processor-api.service";
import {LoopCoreModule} from "@loopstack/core";
import {ProcessorController} from "./controllers/processor.controller";

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forFeature([ProjectEntity, WorkspaceEntity]),
    LoopCoreModule.register({})
  ],
  controllers: [
    ProjectController,
    WorkspaceController,
    ProcessorController,
  ],
  providers: [
    ProjectApiService,
    WorkspaceApiService,
    ProcessorApiService,
  ],
  exports: [
    ProjectApiService,
    WorkspaceApiService,
    ProcessorApiService,
  ]
})
export class LoopstackApiModule extends ConfigurableModuleClass {}
