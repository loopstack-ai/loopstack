import { DynamicModule, INestApplication, Module } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { APP_GUARD } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { TypeOrmModule } from '@nestjs/typeorm';
import cookieParser from 'cookie-parser';
import { AuthModule, JwtAuthGuard, RolesGuard } from '@loopstack/auth';
import {
  DocumentEntity,
  PipelineEntity,
  Role,
  User,
  WorkflowEntity,
  WorkspaceEntity,
  WorkspaceEnvironmentEntity,
} from '@loopstack/common';
import { LoopCoreModule } from '@loopstack/core';
import { AdminRoleController } from './controllers/admin-role.controller';
import { AdminSystemController } from './controllers/admin-system.controller';
import { AdminUserController } from './controllers/admin-user.controller';
import { ConfigController } from './controllers/config.controller';
import { DashboardController } from './controllers/dashboard.controller';
import { DocumentController } from './controllers/document.controller';
import { FileController } from './controllers/file.controller';
import { PipelineController } from './controllers/pipeline.controller';
import { ProcessorController } from './controllers/processor.controller';
import { SecretController } from './controllers/secret.controller';
import { SseController } from './controllers/sse.controller';
import { WorkflowController } from './controllers/workflow.controller';
import { WorkspaceController } from './controllers/workspace.controller';
import { ModuleOptionsInterface } from './interfaces';
import { ConfigurableModuleClass } from './loop-api.module-definition';
import { UserService } from './services';
import { AdminRoleApiService } from './services/admin-role-api.service';
import { AdminSystemApiService } from './services/admin-system-api.service';
import { AdminUserApiService } from './services/admin-user-api.service';
import { DashboardService } from './services/dashboard.service';
import { DocumentApiService } from './services/document-api.service';
import { FileApiService } from './services/file-api.service';
import { FileSystemService } from './services/file-system.service';
import { PipelineApiService } from './services/pipeline-api.service';
import { ProcessorApiService } from './services/processor-api.service';
import { SseEventService } from './services/sse-event.service';
import { WorkflowApiService } from './services/workflow-api.service';
import { WorkspaceApiService } from './services/workspace-api.service';
import { LOOPSTACK_AVAILABLE_ENVIRONMENTS } from './tokens';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PipelineEntity,
      WorkspaceEntity,
      WorkspaceEnvironmentEntity,
      WorkflowEntity,
      DocumentEntity,
      User,
      Role,
    ]),
    LoopCoreModule,
    AuthModule.forRoot(),
  ],
  controllers: [
    AdminRoleController,
    AdminSystemController,
    AdminUserController,
    PipelineController,
    WorkspaceController,
    ProcessorController,
    WorkflowController,
    DocumentController,
    ConfigController,
    DashboardController,
    SseController,
    FileController,
    SecretController,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    AdminRoleApiService,
    AdminSystemApiService,
    AdminUserApiService,
    SseEventService,
    PipelineApiService,
    WorkspaceApiService,
    ProcessorApiService,
    WorkflowApiService,
    DocumentApiService,
    DashboardService,
    UserService,
    FileSystemService,
    FileApiService,
    {
      provide: LOOPSTACK_AVAILABLE_ENVIRONMENTS,
      useValue: [],
    },
  ],
  exports: [
    PipelineApiService,
    WorkspaceApiService,
    ProcessorApiService,
    DashboardService,
    UserService,
    SseEventService,
    LOOPSTACK_AVAILABLE_ENVIRONMENTS,
  ],
})
export class LoopstackApiModule extends ConfigurableModuleClass {
  private static options: ModuleOptionsInterface = {};

  static override register(options: ModuleOptionsInterface): DynamicModule {
    this.options = options;
    const dynamicModule = super.register(options);

    if (options.availableEnvironments) {
      dynamicModule.providers = [
        ...(dynamicModule.providers ?? []),
        {
          provide: LOOPSTACK_AVAILABLE_ENVIRONMENTS,
          useValue: options.availableEnvironments,
        },
      ];
    }

    return dynamicModule;
  }

  static setup(app: INestApplication): void {
    const { cors, swagger } = this.options;

    const corsEnabled = cors?.enabled ?? true;
    if (corsEnabled) {
      app.enableCors(
        cors?.options ??
          ({
            origin: true,
            credentials: true,
          } as CorsOptions),
      );
    }

    const swaggerEnabled = swagger?.enabled ?? true;
    if (swaggerEnabled) {
      const config =
        swagger?.config ??
        new DocumentBuilder()
          .setTitle('Loopstack API Documentation')
          .setDescription('Loopstack API Documentation')
          .setVersion('1.0')
          .build();

      const documentFactory = () => SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api', app, documentFactory);
    }

    app.use(cookieParser());
  }
}
